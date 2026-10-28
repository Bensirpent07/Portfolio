import {Injectable, NgZone} from '@angular/core';
import {environment} from '../../environments/environment';
import {Observable} from 'rxjs';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class AiChatError extends Error {}

@Injectable({
  providedIn: 'root'
})
export class OpenAiService {
  constructor(private ngZone: NgZone) {}

  streamResponse(history: ChatMessage[]): Observable<string> {
    return new Observable<string>(observer => {
      const controller = new AbortController();
      const readResponse = async () => {
        let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
        try {
          const response = await fetch(`${environment.apiUrl}/chat/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history }),
            signal: controller.signal
          });
          if (!response.ok) {
            let message = 'AI chat is temporarily unavailable. Please try again later.';
            try {
              const problem = await response.json();
              if (typeof problem.code === 'string' && problem.code.startsWith('chat_') &&
                  typeof problem.detail === 'string') message = problem.detail;
            } catch { /* A proxy or interrupted server may return an empty error body. */ }
            throw new AiChatError(message);
          }
          if (!response.body) throw new AiChatError('No AI reply was received. Please try again.');
          reader = response.body.getReader();
          const decoder = new TextDecoder();
          let hasContent = false;
          while (!observer.closed) {
            const { done, value } = await reader.read();
            const chunk = done ? decoder.decode() : decoder.decode(value, { stream: true });
            if (chunk) {
              hasContent = true;
              this.ngZone.run(() => observer.next(chunk));
            }
            if (done) break;
          }
          if (!hasContent) throw new AiChatError('No AI reply was received. Please try again.');
          this.ngZone.run(() => observer.complete());
        } catch (error) {
          if (!observer.closed) this.ngZone.run(() => observer.error(error));
        } finally {
          reader?.releaseLock();
        }
      };
      void readResponse();
      return () => controller.abort();
    });
  }
}
