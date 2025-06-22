import {AfterViewInit, Directive, ElementRef, Inject, Input, OnDestroy, PLATFORM_ID, Renderer2} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';

@Directive({
  selector: '[scrollSlideIn]'
})
export class SlideInDirective implements AfterViewInit, OnDestroy{
  @Input('scrollSlideIn') direction: 'left' | 'right' | 'up' | 'down' = 'left';
  private observer!: IntersectionObserver;
  private intersectionThreshold: number = 0.1;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngAfterViewInit() {
    const native = this.el.nativeElement;

    this.renderer.addClass(native, 'opacity-0');
    this.renderer.addClass(native, 'transition-all');
    this.renderer.addClass(native, 'duration-500');
    this.renderer.addClass(native, 'ease-out');

    this.applyDirectionTransform(native);

    if(isPlatformBrowser(this.platformId)){
      this.observer = new IntersectionObserver(entries => {
        for(const entry of entries){
          if(entry.isIntersecting){
            this.reveal(native);
            this.observer.unobserve(native);
          }
        }
      }, { threshold: this.intersectionThreshold });

      this.observer.observe(native);
    }
    else{
      this.reveal(native);
    }
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  private applyDirectionTransform(native: HTMLElement) {
    switch (this.direction) {
      case 'left':  this.renderer.addClass(native, 'translate-x-[-100%]'); break;
      case 'right': this.renderer.addClass(native, 'translate-x-[100%]'); break;
      case 'up':    this.renderer.addClass(native, 'translate-y-[-100%]'); break;
      case 'down':  this.renderer.addClass(native, 'translate-y-[100%]'); break;
    }
  }

  private reveal(native: HTMLElement) {
    this.renderer.removeClass(native, 'opacity-0');
    switch (this.direction) {
      case 'left':  this.renderer.removeClass(native, 'translate-x-[-100%]'); break;
      case 'right': this.renderer.removeClass(native, 'translate-x-[100%]');  break;
      case 'up':    this.renderer.removeClass(native, 'translate-y-[-100%]'); break;
      case 'down':  this.renderer.removeClass(native, 'translate-y-[100%]');  break;
    }

    this.renderer.addClass(native, 'opacity-100');
    this.renderer.addClass(native, 'translate-x-0');
    this.renderer.addClass(native, 'translate-y-0');
  }
}
