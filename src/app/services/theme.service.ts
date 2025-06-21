import {afterNextRender, Inject, Injectable, PLATFORM_ID} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {isPlatformBrowser} from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkTheme: string = 'sunset';
  private lightTheme: string = 'emerald';
  private darkModeSubject = new BehaviorSubject<boolean>(false);
  isDarkMode$ = this.darkModeSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if(isPlatformBrowser(this.platformId)) {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === this.darkTheme) {
        this.setDarkMode(true);
      } else {
        this.setDarkMode(false);
      }
    }
  }

  setDarkMode(isDarkMode: boolean) {
    this.darkModeSubject.next(isDarkMode);
    const element = document.documentElement;
    if (isDarkMode) {
      element.classList.add('dark-mode');
      element.setAttribute('data-theme', this.darkTheme);
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('theme', this.darkTheme);
      }
    } else {
      element.classList.remove('dark-mode');
      element.setAttribute('data-theme', this.lightTheme);
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('theme', this.lightTheme);
      }
    }
  }
}
