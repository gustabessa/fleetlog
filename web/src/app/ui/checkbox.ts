import { Component } from '@angular/core';
/** Styled native checkbox: preserves ngModel, labels, keyboard and fieldset disabling. */
@Component({
  selector: 'fl-checkbox',
  template: `<label
    ><ng-content select="input" /><span class="label"><ng-content /></span
  ></label>`,
  styles: `
    :host {
      display: inline-block;
      max-width: 100%;
    }
    label {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3);
      font: var(--font-label);
      color: var(--text);
      cursor: pointer;
    }
    .label {
      padding-top: 0;
      line-height: 20px;
      overflow-wrap: anywhere;
    }
  `,
})
export class FlCheckbox {}
