import { Component, input } from '@angular/core';

@Component({
  selector: 'fl-field',
  template: `
    <label [for]="controlId()">{{ label() }}</label>
    <ng-content />
    @if (error()) {
      <p [id]="controlId() + '-message'" class="error" role="alert">{{ error() }}</p>
    } @else if (hint()) {
      <p [id]="controlId() + '-message'">{{ hint() }}</p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    label {
      font: var(--font-label);
      color: var(--text);
    }
    p {
      font: var(--font-caption);
      color: var(--muted);
      margin: 0;
    }
    .error {
      color: var(--danger);
    }
  `,
})
export class FlField {
  readonly controlId = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly error = input('');
}
