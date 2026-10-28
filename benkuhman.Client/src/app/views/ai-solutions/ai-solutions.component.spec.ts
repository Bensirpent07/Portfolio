import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiSolutionsComponent } from './ai-solutions.component';
import { AiChatError, OpenAiService } from '../../services/open-ai.service';
import { ToastService } from '../../services/toast.service';
import { Subject, of } from 'rxjs';
import { MarkdownModule } from 'ngx-markdown';
import { provideHttpClient } from '@angular/common/http';

describe('AiSolutionsComponent', () => {
  let component: AiSolutionsComponent;
  let fixture: ComponentFixture<AiSolutionsComponent>;
  let reply: Subject<string>;
  let ai: jasmine.SpyObj<OpenAiService>;
  let toasts: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    reply = new Subject<string>();
    ai = jasmine.createSpyObj<OpenAiService>('OpenAiService', ['streamResponse']);
    ai.streamResponse.and.returnValue(reply.asObservable());
    toasts = jasmine.createSpyObj<ToastService>('ToastService', ['addToast']);
    await TestBed.configureTestingModule({
      imports: [AiSolutionsComponent, MarkdownModule.forRoot()],
      providers: [provideHttpClient(),
        { provide: OpenAiService, useValue: ai },
        { provide: ToastService, useValue: toasts }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AiSolutionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  function startChat() {
    component.chatForm.setValue({ description: 'A retail business', challenge: 'Manual order entry' });
    component.startChat();
    fixture.detectChanges();
  }

  it('replaces a failed loading bubble with a message and allows another submission', () => {
    startChat();
    reply.error(new AiChatError('AI chat is temporarily unavailable. Please try again later.'));
    fixture.detectChanges();
    expect(component.isProcessing()).toBeFalse();
    expect(component.chats()[1].failed).toBeTrue();
    expect(component.chats()[1].content).toContain('temporarily unavailable');
    expect(fixture.nativeElement.querySelector('.loading')).toBeNull();
    expect(toasts.addToast).toHaveBeenCalled();
  });

  it('ignores repeated submissions while a reply is in progress', () => {
    startChat();
    component.startChat();
    component.followUpForm.setValue({ userMessage: 'Another question' });
    component.sendFollowUp();
    expect(ai.streamResponse).toHaveBeenCalledTimes(1);
    expect(component.chats().length).toBe(2);
  });

  it('streams a reply and excludes failed messages from follow-up history', () => {
    startChat();
    reply.error(new Error('Network failure'));
    fixture.detectChanges();
    ai.streamResponse.and.returnValue(of('Try automating order entry.'));
    component.followUpForm.setValue({ userMessage: 'What is the first step?' });
    component.sendFollowUp();
    const history = ai.streamResponse.calls.mostRecent().args[0];
    expect(history.length).toBe(2);
    expect(history.every(message => message.role === 'user')).toBeTrue();
    expect(history.some(message => message.content.includes('Unable to get'))).toBeFalse();
    expect(component.chats().at(-1)?.content).toBe('Try automating order entry.');
    expect(component.isProcessing()).toBeFalse();
  });

  it('treats an empty reply as an error instead of leaving the spinner visible', () => {
    startChat();
    reply.complete();
    fixture.detectChanges();
    expect(component.isProcessing()).toBeFalse();
    expect(component.chats()[1].content).toContain('No AI reply');
    expect(fixture.nativeElement.querySelector('.loading')).toBeNull();
  });

  it('cancels an in-progress reply when starting over', () => {
    startChat();
    component.resetChat();
    fixture.detectChanges();
    expect(reply.observed).toBeFalse();
    expect(component.chats()).toEqual([]);
    expect(component.isProcessing()).toBeFalse();
    expect(fixture.nativeElement.querySelector('#description')).not.toBeNull();
  });
});
