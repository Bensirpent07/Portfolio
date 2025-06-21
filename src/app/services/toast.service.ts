import { Injectable } from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {IconDefinition} from '@fortawesome/angular-fontawesome';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  icon?: IconDefinition;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts: BehaviorSubject<Toast[]> = new BehaviorSubject<Toast[]>([]);
  toasts$: Observable<Toast[]> = this.toasts.asObservable();

  constructor() { }

  addToast(message: string, type: Toast['type'], options?: { duration?: number, icon?: IconDefinition}): void {
    const toast: Toast = {
      id: this.generateId(),
      message,
      type,
      duration: options?.duration || 3000,
      icon: options?.icon || undefined
    };
    this.toasts.next([...this.toasts.getValue(), toast]);

    if (toast.duration) {
      setTimeout(() => this.removeToast(toast.id), toast.duration);
    }
  }

  removeToast(id: string): void {
    const currentToasts = this.toasts.getValue();
    this.toasts.next(currentToasts.filter(toast => toast.id !== id));
  }

  private generateId(): string{
    return (
      Date.now().toString(36) +
      Math.random().toString(36).substring(2, 9)
    );
  }
}
