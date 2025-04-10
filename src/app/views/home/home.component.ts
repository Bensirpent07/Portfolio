import {AfterViewInit, Component, OnInit} from '@angular/core';
import { NavbarComponent } from "../../components/navbar/navbar.component";
import { ButtonModule } from 'primeng/button';
import { RouterLink } from '@angular/router';
import TypeIt from 'typeit';
import {NgClass, NgForOf} from '@angular/common';
import {ThemeService} from '../../services/theme.service';
import {Character} from 'typeit/dist/types';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NavbarComponent, ButtonModule, RouterLink, NgForOf, NgClass],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements AfterViewInit, OnInit{
  isDarkMode: boolean = false;
  activeLogo: string = '';

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
        console.log(this.activeLogo);
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
}
