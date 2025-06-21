import {Component, TemplateRef, ViewChild} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {NavbarComponent} from './components/navbar/navbar.component';
import {ToastService} from './services/toast.service';
import {AsyncPipe, NgClass, NgForOf, NgIf} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, NgForOf, AsyncPipe, NgClass, FaIconComponent, NgIf],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'benkuhman';
  @ViewChild('toastTemplate') toastTemplate!: TemplateRef<any>;

  constructor(
    public toastService: ToastService
  ) {}


}
