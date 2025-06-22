import { Routes } from '@angular/router';
import { HomeComponent } from './views/home/home.component';
import {AboutComponent} from './views/about/about.component';
import {ContactComponent} from './views/contact/contact.component';
import {AiSolutionsComponent} from './views/ai-solutions/ai-solutions.component';

export const routes: Routes = [
  {
      path: '',
      component: HomeComponent
  },
  {
    path: 'about',
    component: AboutComponent
  },
  {
    path: 'contact',
    component: ContactComponent
  },
  {
    path: 'ai-solutions',
    component: AiSolutionsComponent
  }
];
