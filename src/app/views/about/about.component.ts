import { Component } from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faGithub, faLinkedin} from '@fortawesome/free-brands-svg-icons';
import {faCheckCircle, faCode, faDownload, faJetFighterUp, faRocket} from '@fortawesome/free-solid-svg-icons';
import {faHeart} from '@fortawesome/free-solid-svg-icons/faHeart';
import {SlideInDirective} from '../../directives/slide-in.directive';

@Component({
  selector: 'app-about',
  imports: [
    FaIconComponent,
    SlideInDirective
  ],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent {

  protected readonly faLinkedin = faLinkedin;
  protected readonly faGithub = faGithub;
  protected readonly faCheckCircle = faCheckCircle;
  protected readonly faDownload = faDownload;
  protected readonly faRocket = faRocket;
  protected readonly faJetFighterUp = faJetFighterUp;
  protected readonly faCode = faCode;
  protected readonly faHeart = faHeart;
}
