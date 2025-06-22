import {Injectable, Renderer2, RendererFactory2} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EmailjsService {
  private renderer: Renderer2
  private publicKey: string = 'yXqshfuaCswvnrI99';
  private scriptLoaded = false;

  constructor(rendererFactor: RendererFactory2) {
    this.renderer = rendererFactor.createRenderer(null, null);
  }

  sendForm(serviceId: string, templateId: string, form: HTMLFormElement): Promise<any> {
    return this.loadScript().then(() => {
      return (window as any).emailjs.sendForm(serviceId, templateId, form);
    });
  }

  private loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (this.scriptLoaded){
          resolve();
          return;
        }

        const script = this.renderer.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
        script.type = 'text/javascript';

        script.onload = () => {
          this.scriptLoaded = true;
          (window as any).emailjs.init({ publicKey: this.publicKey });
          resolve();
        };

        script.onerror = (error: any) => {
          console.error('Error loading EmailJS script:', error);
          reject(error);
        };

        this.renderer.appendChild(document.body, script);
    });
  }
}
