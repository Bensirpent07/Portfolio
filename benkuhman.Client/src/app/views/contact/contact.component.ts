import {Component, OnInit, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';

import {faCircleCheck, faCircleXmark, faPaperPlane} from '@fortawesome/free-regular-svg-icons';
import {faHeart} from '@fortawesome/free-solid-svg-icons';
import {EmailjsService} from '../../services/emailjs.service';
import {ToastService} from '../../services/toast.service';
import {faGithub, faLinkedin} from '@fortawesome/free-brands-svg-icons';
import {FooterComponent} from '../../components/footer/footer.component';
import {Meta, Title} from '@angular/platform-browser';

@Component({
  selector: 'app-contact',
  imports: [
    FaIconComponent,
    FooterComponent
  ],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent implements OnInit{
  isProcessing = signal(false);

  constructor(
    private emailJsService: EmailjsService,
    private toastsService: ToastService,
    private title: Title,
    private meta: Meta
  ) {}

  ngOnInit() {
    this.title.setTitle('Contact | Ben Kuhman');
    this.meta.updateTag({
      name: 'description',
      content: 'Contact me with your questions, feedback, or inquiries using my simple form. I respond promptly to all messages. Get in touch today!'
    });
  }

  onFormSubmit(event: Event){
    this.isProcessing.set(true);
    event.preventDefault();
    const form = event.target as HTMLFormElement;

    let timeInput = document.createElement('input');
    timeInput.type = 'hidden';
    timeInput.name = 'time';
    form.appendChild(timeInput);
    timeInput.value = new Date().toLocaleString('en-US', {
      year:   'numeric',
      month:  'long',
      day:    'numeric',
      hour:   '2-digit',
      minute: '2-digit'
    });

    this.emailJsService.sendForm('service_ozq7f0v', 'template_mtol3gb', form)
      .then(result => {
        this.toastsService.addToast('Email sent successfully!', 'success', {
          icon: faCircleCheck
        })
        this.isProcessing.set(false);
      })
      .catch(error => {
        console.error('Error sending email:', error);
        this.toastsService.addToast('Failed to send email. Please try again later.', 'error', {
          duration: 5000,
          icon: faCircleXmark
        });
        this.isProcessing.set(false);
      });
  }

  protected readonly faPaperPlane = faPaperPlane;
  protected readonly faLinkedin = faLinkedin;
  protected readonly faHeart = faHeart;
  protected readonly faGithub = faGithub;
}
