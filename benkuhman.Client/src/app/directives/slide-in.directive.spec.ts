import { SlideInDirective } from './slide-in.directive';
import {ElementRef, Renderer2} from '@angular/core';

describe('SlideInDirective', () => {
  it('should create an instance', () => {
    const mockElementRef = { nativeElement: document.createElement('div') } as ElementRef;
    const mockRenderer = jasmine.createSpyObj<Renderer2>('Renderer2', [
      'addClass', 'removeClass'
    ])
    const mockPlatformId = 'browser';

    const directive = new SlideInDirective(mockElementRef, mockRenderer, mockPlatformId);
    expect(directive).toBeTruthy();
  });
});
