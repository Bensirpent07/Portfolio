import { Injectable } from '@angular/core';
import {BehaviorSubject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkModeSubject = new BehaviorSubject<boolean>(false);
  isDarkMode$ = this.darkModeSubject.asObservable();


  constructor() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.setDarkMode(true);
    } else {
      this.setDarkMode(false);
    }
  }

  setDarkMode(isDarkMode: boolean) {
    this.darkModeSubject.next(isDarkMode);
    const element = document.documentElement;
    if (isDarkMode) {
      element.classList.add('dark-mode');
      element.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      element.classList.remove('dark-mode');
      element.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }
}
