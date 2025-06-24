import {Injectable, NgZone} from '@angular/core';
import {environment} from '../../environments/environment';
import {Observable} from 'rxjs';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class OpenAiService {
  constructor(private ngZone: NgZone) {}

  streamResponse(history: ChatMessage[]): Observable<string> {
    return new Observable<string>(observer => {
      fetch(`${environment.apiUrl}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ history })
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const reader = response.body!.getReader();
          const decoder = new TextDecoder();

          const readChunk = () => {
            reader.read()
              .then(({ done, value }) => {
                if (done) {
                  observer.complete();
                  return;
                }
                const chunk = decoder.decode(value, { stream: true });
                // Re-enter Angular zone so bindings update
                this.ngZone.run(() => observer.next(chunk));
                readChunk();
              })
              .catch(err => observer.error(err));
          };

          readChunk();
        })
        .catch(err => observer.error(err));

      // Teardown: (optional) you could cancel the reader here if you track it
      return () => { /* reader.cancel() if you kept a reference */ };
    });
  }
}
