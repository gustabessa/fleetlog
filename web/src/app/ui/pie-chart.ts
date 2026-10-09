import { formatMoney } from './format';
import { Component, computed, input, output } from '@angular/core';
export interface PieCategory {
  moneyLabel?: string;
  kind: string;
  label: string;
  amount: number;
  percent: number;
}
@Component({
  selector: 'fl-pie-chart',
  template: `<div class="chart-layout">
    <svg viewBox="0 0 240 240" aria-label="Custos por categoria">
      @for (slice of slices(); track slice.kind) {
        <path
          [attr.d]="slice.path"
          [attr.fill]="slice.color"
          role="button"
          tabindex="0"
          [attr.aria-label]="slice.label + ', ' + slice.percent.toFixed(1) + '% do total'"
          [attr.aria-pressed]="selected() === slice.kind"
          [class.selected]="selected() === slice.kind"
          (click)="choose.emit(slice.kind)"
          (keydown.enter)="choose.emit(slice.kind)"
          (keydown.space)="$event.preventDefault(); choose.emit(slice.kind)"
        >
          <title>{{ slice.label }}</title>
        </path>
      }
    </svg>
    @if (!slices().length) {
      <p role="status">Sem custos neste período.</p>
    }
    <div class="legend">
      @for (slice of slices(); track slice.kind) {
        <button
          type="button"
          [attr.aria-pressed]="selected() === slice.kind"
          (click)="choose.emit(slice.kind)"
        >
          <span class="dot" [style.background]="slice.color"></span
          ><span
            >{{ slice.label
            }}<small
              >{{ slice.moneyLabel ?? format(slice.amount) }} ·
              {{ slice.percent.toFixed(1).replace('.', ',') }}%</small
            ></span
          >
        </button>
      }
    </div>
  </div>`,
  styles: `
    :host {
      display: block;
    }
    .chart-layout {
      display: flex;
      align-items: center;
      gap: var(--space-8);
    }
    svg {
      width: 240px;
      max-width: 100%;
      flex-shrink: 0;
      overflow: visible;
    }
    path {
      cursor: pointer;
      outline: none !important;
      stroke: var(--surface);
      stroke-width: 3;
    }
    path:focus,
    path:active {
      outline: none !important;
    }
    path:hover,
    path.selected {
      stroke: var(--accent);
      stroke-width: 2;
    }
    path:focus-visible {
      outline: none !important;
      stroke: var(--accent);
      stroke-width: 3;
    }
    .legend {
      flex: 1;
      display: grid;
      gap: var(--space-3);
    }
    button {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      text-align: left;
      background: transparent;
      color: var(--text);
      border: 1px solid transparent;
      border-radius: var(--radius-control);
      padding: var(--space-3);
      font: var(--font-label);
      cursor: pointer;
    }
    button[aria-pressed='true'] {
      background: var(--soft);
      border-color: var(--line);
    }
    small {
      display: block;
      color: var(--muted);
      margin-top: var(--space-1);
    }
    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    @media (max-width: 700px) {
      .chart-layout {
        flex-direction: column;
        gap: var(--space-4);
      }
      .legend {
        width: 100%;
      }
    }
  `,
})
export class FlPieChart {
  readonly categories = input.required<PieCategory[]>();
  readonly selected = input('');
  readonly choose = output<string>();
  readonly slices = computed(() => {
    let angle = -Math.PI / 2;
    return this.categories()
      .filter((row) => row.amount > 0)
      .map((row, index) => {
        const end = angle + (row.percent / 100) * Math.PI * 2;
        const point = (a: number) => `${120 + 108 * Math.cos(a)} ${120 + 108 * Math.sin(a)}`;
        const path =
          row.percent >= 99.999
            ? 'M120 12 A108 108 0 1 1 120 228 A108 108 0 1 1 120 12Z'
            : `M120 120 L${point(angle)} A108 108 0 ${row.percent > 50 ? 1 : 0} 1 ${point(end)} Z`;
        angle = end;
        return {
          ...row,
          path,
          color: ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)'][index % 3],
        };
      });
  });
  readonly format = formatMoney;
}
