import {Component, OnInit} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import {FormsModule} from '@angular/forms';
import {ThemeService} from '../../services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, FaIconComponent, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit{
  isDarkMode = false;
  faSun = faSun;
  faMoon = faMoon;

  constructor(private themeService: ThemeService) {}

  ngOnInit() {
    this.themeService.isDarkMode$.subscribe((isDarkMode: boolean) => {
      this.isDarkMode = isDarkMode;
    });
  }

  toggleDarkMode() {
    this.themeService.setDarkMode(!this.isDarkMode);
  }
}
