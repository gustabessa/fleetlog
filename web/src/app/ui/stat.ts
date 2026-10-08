import { Component, input } from '@angular/core';
import { FlCard } from './card';
@Component({
  selector: 'fl-stat',
  imports: [FlCard],
  template: `<fl-card
    ><span>{{ label() }}</span
    ><strong
      >{{ value() }}
      @if (unit()) {
        <small>{{ unit() }}</small>
      }
    </strong></fl-card
  >`,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    span {
      display: block;
      min-width: 0;
      color: var(--muted);
      font: var(--font-caption);
      margin-bottom: var(--space-3);
    }
    strong {
      font: var(--font-metric);
      white-space: nowrap;
      flex-shrink: 0;
    }
    small {
      font: var(--font-body);
      color: var(--muted);
    }
    @media (max-width: 700px) {
      fl-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
      }
      span {
        margin: 0;
      }
    }
  `,
})
export class FlStat {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly unit = input('');
}
