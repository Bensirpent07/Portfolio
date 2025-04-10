import {Component, OnInit} from '@angular/core';
import {ButtonModule} from 'primeng/button';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {NgForOf} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import {Menu} from 'primeng/menu';
import {ToggleSwitch} from 'primeng/toggleswitch';
import {FormsModule} from '@angular/forms';
import {ThemeService} from '../../services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [ButtonModule, RouterLink, NgForOf, RouterLinkActive, FaIconComponent, Menu, ToggleSwitch, FormsModule],
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
    this.themeService.setDarkMode(this.isDarkMode);
  }
}
