import {Component, TemplateRef, ViewChild} from '@angular/core';
import {Router, RouterOutlet} from '@angular/router';
import {NavbarComponent} from './components/navbar/navbar.component';
import {ToastService} from './services/toast.service';
import { AsyncPipe, NgClass } from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, AsyncPipe, NgClass, FaIconComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent{
  title = 'Ben Kuhman';
  @ViewChild('toastTemplate') toastTemplate!: TemplateRef<any>;

  constructor(
    public toastService: ToastService,
    private router: Router
  ) {}
}
