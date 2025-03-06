import { Component } from '@angular/core';
import { NavbarComponent } from "../../components/navbar/navbar.component";
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-home',
  imports: [NavbarComponent, FontAwesomeModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent{
  faArrowRight = faArrowRight;
}
