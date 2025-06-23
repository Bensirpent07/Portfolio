import {Component, OnInit, signal} from '@angular/core';
import {FooterComponent} from '../../components/footer/footer.component';
import {OpenAiService} from '../../services/open-ai.service';
import {FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {NgClass} from '@angular/common';
import {MarkdownComponent} from 'ngx-markdown';
import {ToastService} from '../../services/toast.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faPaperPlane} from '@fortawesome/free-regular-svg-icons';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-ai-solutions',
  imports: [
    FooterComponent,
    ReactiveFormsModule,
    NgClass,
    MarkdownComponent,
    FaIconComponent
  ],
  templateUrl: './ai-solutions.component.html',
  styleUrl: './ai-solutions.component.scss'
})
export class AiSolutionsComponent implements OnInit{
  chatForm: FormGroup;
  chats: ChatMessage[] = [];
  isProcessing = signal(false);
  isChatStarted = signal(false);

  constructor(
    private aiService: OpenAiService,
    private fb: FormBuilder,
    private toastService: ToastService
  ) {
    this.chatForm = this.fb.group({
      description: [''],
      challenge: ['']
    });
  }

  ngOnInit() {

  }

  getResponse(): void{
    this.isChatStarted.set(true);
    this.isProcessing.set(true);
    const payload = this.chatForm.value;

    // 1) Push an empty assistant message so we have a place to append
    this.chats.push({ role: 'assistant', content: '' });
    const idx = this.chats.length - 1;

    // 2) Subscribe to the stream
    this.aiService.streamResponse(payload).subscribe({
      next: chunk => {
        // 3) Append each chunk as it arrives
        this.chats[idx].content += chunk;
      },
      error: err => {
        console.error('Stream error', err);
        this.toastService.addToast('Failed to fetch AI response. Please try again.', 'error');
        this.isProcessing.set(false);
      },
      complete: () => {
        // 4) Done!
        this.isProcessing.set(false);
      }
    });
  }

  protected readonly faPaperPlane = faPaperPlane;
}
