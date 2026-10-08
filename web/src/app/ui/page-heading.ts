import { Component, input } from '@angular/core';
@Component({
  selector: 'fl-page-heading',
  template: `<header>
    @if (eyebrow()) {
      <p class="fl-eyebrow">{{ eyebrow() }}</p>
    }
    <h1>{{ title() }}</h1>
    <p class="fl-subtitle"><ng-content /></p>
  </header>`,
  styles: `
    :host {
      display: block;
    }
    h1 {
      margin: var(--space-3) 0;
    }
    p {
      margin: 0;
    }
  `,
})
export class FlPageHeading {
  readonly title = input.required<string>();
  readonly eyebrow = input('');
}
