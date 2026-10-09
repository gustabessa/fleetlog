import { Component, input } from '@angular/core';

@Component({
  selector: 'button[flButton]',
  template: `@if (loading()) {
      <span class="button-spinner" aria-hidden="true"></span>
    }
    <ng-content />`,
  styleUrl: './button.css',
  host: {
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
    '[disabled]': 'disabled() || loading()',
    '[attr.aria-busy]': 'loading() || null',
    '[attr.type]': 'type()',
  },
})
export class FlButton {
  readonly variant = input<'primary' | 'secondary' | 'ghost' | 'tab'>('secondary');
  readonly size = input<'sm' | 'md' | 'lg' | 'icon'>('md');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly type = input<'button' | 'submit' | 'reset'>('button');
}
