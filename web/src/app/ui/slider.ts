import { Component, computed, input, model } from '@angular/core';

/** Native range semantics and keyboard handling with shared theme tokens. */
@Component({
  selector: 'fl-slider',
  template: `
    <label>
      <span class="heading">
        <span>{{ label() }}</span>
        <span class="value" aria-hidden="true">{{ value() }}{{ suffix() }}</span>
      </span>
      <input
        type="range"
        [attr.aria-label]="label()"
        [attr.aria-valuetext]="value() + suffix()"
        [min]="min()"
        [max]="max()"
        [step]="step()"
        [value]="value()"
        [disabled]="disabled()"
        [style.--fill]="fill() + '%'"
        (input)="update($event)"
      />
    </label>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
      max-width: 100%;
    }
    label {
      display: grid;
      gap: var(--space-1);
      color: var(--text);
      font: var(--font-label);
    }
    .heading {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: var(--space-3);
      overflow-wrap: anywhere;
    }
    .value {
      color: var(--muted);
      font-variant-numeric: tabular-nums;
      flex-shrink: 0;
    }
    input[type='range'] {
      appearance: none;
      -webkit-appearance: none;
      display: block;
      width: 100%;
      min-width: 0;
      height: 44px;
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: var(--radius-control);
      background: transparent;
      cursor: pointer;
      accent-color: var(--accent);
    }
    input[type='range']:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    input[type='range']:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    input::-webkit-slider-runnable-track {
      height: 6px;
      border-radius: 999px;
      background: linear-gradient(
        to right,
        var(--accent) 0 var(--fill),
        var(--line) var(--fill) 100%
      );
    }
    input::-webkit-slider-thumb {
      appearance: none;
      -webkit-appearance: none;
      width: 24px;
      height: 24px;
      margin-top: -9px;
      border: 2px solid var(--accent);
      border-radius: 50%;
      background: var(--surface);
    }
    input::-moz-range-track {
      height: 6px;
      border-radius: 999px;
      background: var(--line);
    }
    input::-moz-range-progress {
      height: 6px;
      border-radius: 999px;
      background: var(--accent);
    }
    input::-moz-range-thumb {
      box-sizing: border-box;
      width: 24px;
      height: 24px;
      border: 2px solid var(--accent);
      border-radius: 50%;
      background: var(--surface);
    }
    @media (forced-colors: active) {
      input[type='range'] {
        appearance: auto;
        -webkit-appearance: auto;
        accent-color: auto;
      }
      input[type='range']:focus-visible {
        outline-color: Highlight;
      }
      input[type='range']:disabled {
        opacity: 1;
      }
      input::-webkit-slider-runnable-track {
        background: Canvas;
        border: 1px solid CanvasText;
      }
      input::-webkit-slider-thumb {
        background: ButtonFace;
        border-color: ButtonText;
      }
      input::-moz-range-track {
        background: Canvas;
        border: 1px solid CanvasText;
      }
      input::-moz-range-progress {
        background: Highlight;
      }
      input::-moz-range-thumb {
        background: ButtonFace;
        border-color: ButtonText;
      }
    }
  `,
})
export class FlSlider {
  readonly label = input.required<string>();
  readonly min = input(0);
  readonly max = input(100);
  readonly step = input(1);
  readonly value = model(0);
  readonly suffix = input('');
  readonly disabled = input(false);
  readonly fill = computed(() => {
    const span = this.max() - this.min();
    return span > 0 ? Math.max(0, Math.min(100, ((this.value() - this.min()) / span) * 100)) : 0;
  });

  update(event: Event) {
    if (!this.disabled()) this.value.set((event.target as HTMLInputElement).valueAsNumber);
  }
}
