import {Component, HostListener, OnInit, signal} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {FormsModule} from '@angular/forms';
import {ThemeService} from '../../services/theme.service';
import {faMoon, faSun} from '@fortawesome/free-regular-svg-icons';
import {NgClass} from '@angular/common';
import {faBarsStaggered} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, FaIconComponent, FormsModule, RouterLinkActive, NgClass],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit{
  isDarkMode = false;
  isScrolled = signal(false);
  navItems = [
    { label: 'Home', path: '/', exact: true },
    { label: 'About', path: '/about', exact: false },
    { label: 'Contact', path: '/contact', exact: false }
  ];

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled.set(window.scrollY > 0);
  }

  constructor(private themeService: ThemeService) {}

  ngOnInit() {
    this.themeService.isDarkMode$.subscribe((isDarkMode: boolean) => {
      this.isDarkMode = isDarkMode;
    });
  }

  toggleDarkMode() {
    this.themeService.setDarkMode(!this.isDarkMode);
  }

  protected readonly faSun = faSun;
  protected readonly faMoon = faMoon;
  protected readonly faBarsStaggered = faBarsStaggered;
}
