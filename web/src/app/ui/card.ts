import { Component, input } from '@angular/core';

@Component({
  selector: 'fl-card, section[flCard]',
  template: `<ng-content />`,
  host: { '[attr.data-padding]': 'padding()' },
  styles: `
    :host {
      display: block;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-card);
      padding: var(--space-6);
    }
    :host([data-padding='none']) {
      padding: 0;
      overflow: hidden;
    }
    :host([data-padding='sm']) {
      padding: var(--space-4);
    }
    @media (max-width: 700px) {
      :host {
        padding: var(--space-5);
      }
      :host([data-padding='none']) {
        padding: 0;
      }
      :host([data-padding='sm']) {
        padding: var(--space-4);
      }
    }
  `,
})
export class FlCard {
  readonly padding = input<'none' | 'sm' | 'md'>('md');
}
