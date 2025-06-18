import {AfterViewInit, Component, OnInit} from '@angular/core';
import { NavbarComponent } from "../../components/navbar/navbar.component";
import TypeIt from 'typeit';
import {NgClass, NgForOf, NgOptimizedImage} from '@angular/common';
import {ThemeService} from '../../services/theme.service';
import {Character} from 'typeit/dist/types';
import {FaIconComponent, IconDefinition} from '@fortawesome/angular-fontawesome';
import {faAngular, faFigma, faGithub, faLinkedin, faMicrosoft} from '@fortawesome/free-brands-svg-icons';
import {
  faBullhorn,
  faChartLine,
  faDatabase,
  faDollarSign,
  faPaintBrush,
  faSearch,
  faStore
} from '@fortawesome/free-solid-svg-icons';
import {
  faChartBar,
  faCommentDots,
  faEye,
  faHandshake,
  faMessage,
  faPaperPlane
} from '@fortawesome/free-regular-svg-icons';
import {faHeart} from '@fortawesome/free-solid-svg-icons/faHeart';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NavbarComponent, NgForOf, NgClass, FaIconComponent, NgOptimizedImage],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements AfterViewInit, OnInit{
  isDarkMode: boolean = false;
  activeLogo: string = '';
  faAngular: IconDefinition = faAngular;
  faMicrosoft: IconDefinition = faMicrosoft;
  faDatabase: IconDefinition = faDatabase;
  faFigma: IconDefinition = faFigma;
  faPaperPlane: IconDefinition = faPaperPlane;
  faEye: IconDefinition = faEye;
  faHandshake: IconDefinition = faHandshake;
  faBullhorn: IconDefinition = faBullhorn;

  constructor(private themeService: ThemeService) {}

  ngOnInit() {
    this.themeService.isDarkMode$.subscribe((isDarkMode: boolean) => {
      this.isDarkMode = isDarkMode;
    });
  }

  ngAfterViewInit() {
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

  private shuffleStrings(array: string[]): string[]{
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  protected readonly faSearch = faSearch;
  protected readonly faStore = faStore;
  protected readonly faChartLine = faChartLine;
  protected readonly faDollarSign = faDollarSign;
  protected readonly faChartBar = faChartBar;
  protected readonly faCommentDots = faCommentDots;
  protected readonly faMessage = faMessage;
  protected readonly faHeart = faHeart;
  protected readonly faGithub = faGithub;
  protected readonly faLinkedin = faLinkedin;
}
