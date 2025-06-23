import {Injectable, NgZone} from '@angular/core';
import {environment} from '../../environments/environment';
import {Observable} from 'rxjs';

export interface ChatPayload {
  description: string;
  challenge: string;
}

@Injectable({
  providedIn: 'root'
})
export class OpenAiService {
  constructor(private ngZone: NgZone) {}

  streamResponse(payload: ChatPayload): Observable<string> {
    return new Observable<string>(observer => {
      fetch(`${environment.apiUrl}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
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
