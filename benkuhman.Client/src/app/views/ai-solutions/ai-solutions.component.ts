import {Component, ElementRef, signal, ViewChild} from '@angular/core';
import {FooterComponent} from '../../components/footer/footer.component';
import {ChatMessage, OpenAiService} from '../../services/open-ai.service';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {NgClass, NgOptimizedImage} from '@angular/common';
import {MarkdownComponent} from 'ngx-markdown';
import {ToastService} from '../../services/toast.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faPaperPlane, faUser} from '@fortawesome/free-regular-svg-icons';
import {faCheck} from '@fortawesome/free-solid-svg-icons';

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
export class AiSolutionsComponent {
  chatForm: FormGroup;
  followUpForm: FormGroup;
  chats = signal<ChatMessage[]>([]);
  isProcessing = signal(false);
  @ViewChild('chatContainer') private chatContainer!: ElementRef<HTMLElement>;

  constructor(
    private aiService: OpenAiService,
    private fb: FormBuilder,
    private toastService: ToastService
  ) {
    this.chatForm = this.fb.group({
      description: ['', Validators.required],
      challenge: ['']
    });
    this.followUpForm = this.fb.group({
      userMessage: ['', Validators.required]
    });
  }

  get chatBubbles(): ChatMessage[] {
    return this.chats().slice(2);
  }

  startChat(): void{
    this.chatForm.markAllAsTouched();
    if (this.chatForm.invalid) {
      this.toastService.addToast('Please fill in the required fields.', 'error');
      return;
    }

    this.isProcessing.set(true);
    const system: ChatMessage = {
      role: "system",
      content: "Suggest AI solutions tailored to a business based on its description and an optional challenge or difficulty the business faces.\n\nConsider the type of business, its operations, customer interactions, and any stated challenges. Identify AI solutions that can enhance efficiency, improve customer engagement, or address specific business difficulties.\n\n# Steps\n\n1. **Understand the Business**: Analyze the provided business description to determine its main activities, industry, and goals.\n2. **Identify Challenges**: Take note of any optional challenges mentioned to understand specific areas where the business might benefit from an AI solution.\n3. **Match AI Solutions**: Suggest AI solutions that align with the business operations and address any challenges. Consider various AI domains such as automation, data analysis, customer service, etc.\n4. **Provide Justification**: Offer reasoning for each suggested AI solution, explaining how it fits the business and addresses the stated challenges.\n\n# Output Format\n\nThe response should be a structured list of 2-3 AI solutions with a brief explanation for each on how it benefits the business, formatted as follows:\n- [AI Solution Name]: [Description of how this AI solution can aid the business and address any challenges.]\n\nAt the end of the list, include a brief question or invitation to engage further, such as:\n\n- \"Would you like more suggestions for another aspect of the business?\"\n- \"Would you like suggestions based on another challenge of your business?\"\n- \"Would you like to know what others in similar businesses are doing to implement AI solutions?\"\n\n# Examples\n\n**Example 1:**\n- **Business Description**: A retail store focusing on sustainable clothing.\n- **Challenge**: Difficulty in predicting inventory needs.\n\n  **Output**:\n  - **AI-Driven Inventory Management**: Utilize AI algorithms to analyze sales data and predict inventory needs, minimizing stockouts and overstocks.\n  - **Chatbot for Customer Service**: Implement a chatbot to assist customers with queries on sustainable practices and availability of products.\n\n**Example 2:**\n- **Business Description**: A digital marketing agency that specializes in social media campaigns.\n- **Challenge**: Managing client engagements and campaign tracking.\n\n  **Output**:\n  - **AI-Powered Analytics Tools**: Employ AI to provide insights on campaign performance and optimize future strategies based on data trends.\n  - **Automated Client Reporting**: Use AI to generate real-time, automated reports for clients, improving engagement and transparency.\n\n# Notes\n\n- Ensure any suggested AI solution aligns with the business size and capability to implement such technologies.\n- Consider the potential ROI and practicality of the AI solution for the specific business scenario.\n\n# Tone\n\n- The response should use simple, friendly language that a non-technical business owner can easily understand.\n- Avoid technical jargon like \"NLP\" or \"OCR\" unless briefly explained in plain terms.\n- Aim for a helpful, conversational tone. Think of this as advice from a friendly consultant, not a technical report."
    };

    const user: ChatMessage = {
      role: "user",
      content: `Business Description: ${this.chatForm.value.description}\nChallenge: ${this.chatForm.value.challenge || 'None'}`
    };

    this.chats.set([system, user]);
    this.stream();
  }

  sendFollowUp(): void{
    this.followUpForm.markAllAsTouched();
    if (this.followUpForm.invalid) {
      return;
    }

    this.isProcessing.set(true);
    this.chats().push({ role: 'user', content: this.followUpForm.value.userMessage });
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
    const history = [...this.chats()];
    this.chats().push({ role: 'assistant', content: '' });
    const assistantIndex = history.length;

    this.aiService.streamResponse(history).subscribe({
      next: chunk => {
        this.chats()[assistantIndex].content += chunk;
        this.scrollToBottom();
      },
      error: err => {
        this.toastService.addToast('Failed to fetch AI response. Please try again.', 'error');
        this.isProcessing.set(false);
      },
      complete: () => {
        this.isProcessing.set(false)
        this.scrollToBottom();
      }
    });
  }

  private scrollToBottom(smooth = true): void{
    const el = this.chatContainer.nativeElement;
    if (smooth && 'scrollBehavior' in document.documentElement.style) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }

  protected readonly faPaperPlane = faPaperPlane;
  protected readonly faUser = faUser;
}
