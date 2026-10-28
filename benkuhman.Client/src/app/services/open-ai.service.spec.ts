import { TestBed } from '@angular/core/testing';

import { AiChatError, OpenAiService } from './open-ai.service';
import { lastValueFrom, toArray } from 'rxjs';

describe('OpenAiService', () => {
  let service: OpenAiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OpenAiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('decodes UTF-8 characters split across network chunks', async () => {
    const bytes = new TextEncoder().encode('Ideas for a café 🚀');
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 15));
        controller.enqueue(bytes.slice(15, bytes.length - 2));
        controller.enqueue(bytes.slice(bytes.length - 2));
        controller.close();
      }
    });
    spyOn(globalThis, 'fetch').and.resolveTo(new Response(body));
    const chunks = await lastValueFrom(service.streamResponse([{ role: 'user', content: 'Hello' }]).pipe(toArray()));
    expect(chunks.join('')).toBe('Ideas for a café 🚀');
  });

  it('uses a safe structured API error', async () => {
    spyOn(globalThis, 'fetch').and.resolveTo(new Response(JSON.stringify({
      code: 'chat_unavailable', detail: 'AI chat is temporarily unavailable. Please try again later.'
    }), { status: 503 }));
    await expectAsync(lastValueFrom(service.streamResponse([{ role: 'user', content: 'Hello' }])))
      .toBeRejectedWithError(AiChatError, 'AI chat is temporarily unavailable. Please try again later.');
  });

  it('handles an empty legacy HTTP 500 response', async () => {
    spyOn(globalThis, 'fetch').and.resolveTo(new Response(null, { status: 500 }));
    await expectAsync(lastValueFrom(service.streamResponse([{ role: 'user', content: 'Hello' }])))
      .toBeRejectedWithError(AiChatError, 'AI chat is temporarily unavailable. Please try again later.');
  });

  it('treats an empty successful stream as a failed reply', async () => {
    spyOn(globalThis, 'fetch').and.resolveTo(new Response(''));
    await expectAsync(lastValueFrom(service.streamResponse([{ role: 'user', content: 'Hello' }])))
      .toBeRejectedWithError(AiChatError, 'No AI reply was received. Please try again.');
  });

  it('aborts the fetch when the conversation is cancelled', () => {
    let signal: AbortSignal | null | undefined;
    spyOn(globalThis, 'fetch').and.callFake((_input, init) => {
      signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    });
    const subscription = service.streamResponse([{ role: 'user', content: 'Hello' }]).subscribe();
    expect(signal?.aborted).toBeFalse();
    subscription.unsubscribe();
    expect(signal?.aborted).toBeTrue();
  });
});
