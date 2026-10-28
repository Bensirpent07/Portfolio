import {Component, ElementRef, OnDestroy, OnInit, signal, ViewChild} from '@angular/core';
import {FooterComponent} from '../../components/footer/footer.component';
import {AiChatError, ChatMessage, OpenAiService} from '../../services/open-ai.service';
import {Subscription} from 'rxjs';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {NgClass, NgOptimizedImage} from '@angular/common';
import {MarkdownComponent} from 'ngx-markdown';
import {ToastService} from '../../services/toast.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faPaperPlane, faUser} from '@fortawesome/free-regular-svg-icons';
import {faCheck} from '@fortawesome/free-solid-svg-icons';
import {Meta, Title} from '@angular/platform-browser';

@Component({
  selector: 'app-ai-solutions',
  imports: [
    FooterComponent,
    ReactiveFormsModule,
    NgClass,
    MarkdownComponent,
    FaIconComponent,
    NgOptimizedImage,
    FormsModule,
  ],
  templateUrl: './ai-solutions.component.html',
  styleUrl: './ai-solutions.component.scss'
})
export class AiSolutionsComponent implements OnInit, OnDestroy{
  chatForm: FormGroup;
  followUpForm: FormGroup;
  chats = signal<(ChatMessage & { failed?: boolean })[]>([]);
  isProcessing = signal(false);
  @ViewChild('chatContainer') private chatContainer!: ElementRef<HTMLElement>;
  private chatSubscription?: Subscription;

  constructor(
    private aiService: OpenAiService,
    private fb: FormBuilder,
    private toastService: ToastService,
    private title: Title,
    private meta: Meta
  ) {
    this.chatForm = this.fb.group({
      description: ['', Validators.required],
      challenge: ['']
    });
    this.followUpForm = this.fb.group({
      userMessage: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.title.setTitle('AI Solutions | Ben Kuhman');
    this.meta.updateTag({
      name: 'description',
      content: 'Discover how AI can solve your business challenges. Describe your business and get tailored AI solutions and advice instantly with our interactive chat.'
    });
  }

  get chatBubbles(): ChatMessage[] {
    return this.chats().slice(1);
  }

  startChat(): void{
    if (this.isProcessing()) return;
    this.chatForm.markAllAsTouched();
    if (this.chatForm.invalid) {
      this.toastService.addToast('Please fill in the required fields.', 'error');
      return;
    }

    this.isProcessing.set(true);
    const user: ChatMessage = {
      role: "user",
      content: `Business Description: ${this.chatForm.value.description}\nChallenge: ${this.chatForm.value.challenge || 'None'}`
    };

    this.chats.set([user]);
    this.stream();
  }

  sendFollowUp(): void{
    if (this.isProcessing()) return;
    this.followUpForm.markAllAsTouched();
    if (this.followUpForm.invalid) {
      return;
    }

    this.isProcessing.set(true);
    this.chats.update(messages => [...messages, { role: 'user', content: this.followUpForm.value.userMessage }]);
    this.followUpForm.reset();
    this.scrollToBottom();
    this.stream();
  }

  submitOnEnter(event: Event){
    event.preventDefault();
    this.startChat();
  }

  submitFollowUpOnEnter(event: Event){
    event.preventDefault();
    this.sendFollowUp();
  }

  isInvalid(form: FormGroup, controlName: string) {
    const ctrl = form.get(controlName);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  private stream(): void{
    const history = this.chats().filter(message => !message.failed)
      .map(({ role, content }) => ({ role, content }));
    const assistantIndex = this.chats().length;
    this.chats.update(messages => [...messages, { role: 'assistant', content: '' }]);

    this.chatSubscription = this.aiService.streamResponse(history).subscribe({
      next: chunk => {
        this.chats.update(messages => messages.map((message, index) => index === assistantIndex
          ? { ...message, content: message.content + chunk } : message));
        this.scrollToBottom();
      },
      error: err => {
        this.failReply(assistantIndex, err);
      },
      complete: () => {
        if (!this.chats()[assistantIndex]?.content) {
          this.failReply(assistantIndex, new AiChatError('No AI reply was received. Please try again.'));
          return;
        }
        this.isProcessing.set(false)
        this.scrollToBottom();
      }
    });
  }

  private failReply(index: number, error: unknown): void {
    const message = error instanceof AiChatError ? error.message
      : 'Unable to get an AI reply. Please try again.';
    this.chats.update(messages => messages.map((entry, entryIndex) => entryIndex === index
      ? { ...entry, failed: true, content: entry.content
          ? `${entry.content}\n\n_I couldn’t finish this reply. Please try again._` : message } : entry));
    this.toastService.addToast(message, 'error');
    this.isProcessing.set(false);
  }

  resetChat(): void {
    this.chatSubscription?.unsubscribe();
    this.chats.set([]);
    this.chatForm.reset();
    this.followUpForm.reset();
    this.isProcessing.set(false);
  }

  ngOnDestroy(): void {
    this.chatSubscription?.unsubscribe();
  }

  private scrollToBottom(smooth = true): void{
    const el = this.chatContainer?.nativeElement;
    if (!el) return;
    if (smooth && 'scrollBehavior' in document.documentElement.style) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }

  protected readonly faPaperPlane = faPaperPlane;
  protected readonly faUser = faUser;
}
