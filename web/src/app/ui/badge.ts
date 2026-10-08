import { Component, computed, input } from '@angular/core';
@Component({
  selector: 'fl-badge',
  host: { '[style.background-color]': 'color() || null', '[style.color]': 'foreground()' },
  template: `<ng-content />`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-pill);
      background: var(--soft);
      color: var(--accent);
      font: var(--font-caption);
      font-weight: var(--weight-semibold);
    }
  `,
})
export class FlBadge {
  readonly color = input('');
  readonly foreground = computed(() => {
    if (!/^#[0-9a-f]{6}$/i.test(this.color())) return null;
    const rgb = [1, 3, 5]
      .map((offset) => parseInt(this.color().slice(offset, offset + 2), 16) / 255)
      .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179 ? '#10191f' : '#ffffff';
  });
}
