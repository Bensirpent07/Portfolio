import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Renderer2, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [RouterModule, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  @ViewChild('navbar') navbar!: ElementRef;
  isScrolled: boolean = false;


  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrolled = window.scrollY > 0;
    if (scrolled !== this.isScrolled) {
      this.isScrolled = scrolled;
      // this.cdr.detectChanges(); // Ensure UI updates properly
    }
  }
}
