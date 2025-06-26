import {AfterViewInit, Component, OnInit, signal} from '@angular/core';
import TypeIt from 'typeit';
import { NgClass, NgOptimizedImage } from '@angular/common';
import {ThemeService} from '../../services/theme.service';
import {Character} from 'typeit/dist/types';
import {FaIconComponent, IconDefinition} from '@fortawesome/angular-fontawesome';
import {faAngular, faFigma, faGithub, faLinkedin, faMicrosoft} from '@fortawesome/free-brands-svg-icons';
import {
  faBullhorn, faDatabase, faHeart
} from '@fortawesome/free-solid-svg-icons';
import {
  faChartBar, faCircleCheck, faCircleXmark,
  faEye,
  faHandshake,
  faPaperPlane
} from '@fortawesome/free-regular-svg-icons';
import {EmailjsService} from '../../services/emailjs.service';
import {ToastService} from '../../services/toast.service';
import {RouterLink} from '@angular/router';
import {SlideInDirective} from '../../directives/slide-in.directive';
import {FooterComponent} from '../../components/footer/footer.component';
import {Title} from '@angular/platform-browser';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgClass, FaIconComponent, NgOptimizedImage, RouterLink, SlideInDirective, FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements AfterViewInit, OnInit{
  isDarkMode: boolean = false;
  activeLogo: string = '';
  isProcessing = signal(false);

  faAngular: IconDefinition = faAngular;
  faMicrosoft: IconDefinition = faMicrosoft;
  faDatabase: IconDefinition = faDatabase;
  faFigma: IconDefinition = faFigma;
  faPaperPlane: IconDefinition = faPaperPlane;
  faEye: IconDefinition = faEye;
  faHandshake: IconDefinition = faHandshake;
  faBullhorn: IconDefinition = faBullhorn;

  constructor(
    private themeService: ThemeService,
    private emailJsService: EmailjsService,
    private toastsService: ToastService,
    private title: Title
  ) {}

  ngOnInit() {
    this.themeService.isDarkMode$.subscribe((isDarkMode: boolean) => {
      this.isDarkMode = isDarkMode;
    });
    this.title.setTitle('Ben Kuhman');
  }

  ngAfterViewInit() {
    if (typeof document === 'undefined') {
      return;
    }

    const strings = [
      "Angular",
      ".NET",
      "C#",
      "MySQL",
      "MSSQL",
      "TypeScript",
      "JavaScript",
      "HTML",
      "CSS",
      "TailwindCSS",
      "Bootstrap",
      "PrimeNG"
    ];
    const shuffledStrings = this.shuffleStrings(strings)
    const instance = new TypeIt('#typeit-element', {
      strings: shuffledStrings,
      speed: 50,
      loop: true,
      lifeLike: true,
      breakLines: false,
      nextStringDelay: 4000,
      afterString: (characters: Character[]) => {
        this.activeLogo = characters.toString().toLowerCase().replace(/\W/g, '');
      }
    })
    instance.go();
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

  private shuffleStrings(array: string[]): string[]{
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  protected readonly faChartBar = faChartBar;
  protected readonly faHeart = faHeart;
  protected readonly faGithub = faGithub;
  protected readonly faLinkedin = faLinkedin;
}
