import { Component } from '@angular/core';
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faGithub, faLinkedin} from '@fortawesome/free-brands-svg-icons';
import {faHeart} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-footer',
    imports: [
        FaIconComponent
    ],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {

  protected readonly faGithub = faGithub;
  protected readonly faHeart = faHeart;
  protected readonly faLinkedin = faLinkedin;
}
