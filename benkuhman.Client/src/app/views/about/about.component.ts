import {Component, OnInit} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faGithub, faLinkedin} from '@fortawesome/free-brands-svg-icons';
import {faCheckCircle, faCode, faDownload, faJetFighterUp, faRocket, faHeart} from '@fortawesome/free-solid-svg-icons';
import {SlideInDirective} from '../../directives/slide-in.directive';
import {FooterComponent} from '../../components/footer/footer.component';
import {Title} from '@angular/platform-browser';

@Component({
  selector: 'app-about',
  imports: [
    FaIconComponent,
    SlideInDirective,
    FooterComponent
  ],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent implements OnInit{

  constructor(private title: Title) {}

  ngOnInit() {
    this.title.setTitle('About | Ben Kuhman');
  }

  protected readonly faLinkedin = faLinkedin;
  protected readonly faGithub = faGithub;
  protected readonly faCheckCircle = faCheckCircle;
  protected readonly faDownload = faDownload;
  protected readonly faRocket = faRocket;
  protected readonly faJetFighterUp = faJetFighterUp;
  protected readonly faCode = faCode;
}
