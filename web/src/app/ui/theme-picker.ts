import { FlDialog } from './dialog';
import { Component, input, output, viewChild } from '@angular/core';
import { FlButton } from './button';
import { palettes } from './themes';
@Component({
  selector: 'fl-theme-picker',
  imports: [FlButton, FlDialog],
  template: `<button
      flButton
      size="icon"
      aria-label="Escolher tema"
      [attr.title]="currentName()"
      (click)="show()"
    >
      <span aria-hidden="true">◐</span>
    </button>
    <fl-dialog #dialog title="Escolha o tema">
      <div class="modes" aria-label="Aparência">
        <button
          flButton
          [variant]="dark() ? 'secondary' : 'primary'"
          [attr.aria-pressed]="!dark()"
          (click)="select.emit({ palette: palette(), dark: false })"
        >
          ☀ Claro</button
        ><button
          flButton
          [variant]="dark() ? 'primary' : 'secondary'"
          [attr.aria-pressed]="dark()"
          (click)="select.emit({ palette: palette(), dark: true })"
        >
          ☾ Escuro
        </button>
      </div>
      <div class="palettes">
        @for (theme of palettes; track theme.id) {
          <button
            type="button"
            class="palette"
            [attr.data-palette]="theme.id"
            [attr.aria-pressed]="palette() === theme.id"
            (click)="select.emit({ palette: theme.id, dark: dark() })"
          >
            <span class="sample" [style.background]="color('bg')"
              ><span class="sample-card" [style.background]="color('surface')"
                ><span [style.background]="color('text')"></span
                ><span [style.background]="color('accent')"></span></span
              ><span class="swatches"
                ><i [style.background]="color('bg')"></i
                ><i [style.background]="color('surface')"></i
                ><i [style.background]="color('accent')"></i
                ><i [style.background]="color('text')"></i></span
            ></span>
            <span>{{ theme.name }}</span>
            @if (palette() === theme.id) {
              <span class="check" aria-hidden="true">✓</span>
            }
          </button>
        }
      </div>
      <button flDialogFooter flButton class="done" variant="primary" (click)="dialog.close()">
        Concluir
      </button>
    </fl-dialog>`,
  styles: `
    :host {
      display: block;
      margin-left: auto;
    }
    .modes {
      display: flex;
      gap: var(--space-2);
      margin: 0 0 var(--space-5);
    }
    .modes button {
      flex: 1;
    }
    .palettes {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-3);
    }
    .palette {
      position: relative;
      display: grid;
      gap: var(--space-2);
      padding: var(--space-2);
      text-align: left;
      border: 1px solid var(--line);
      border-radius: var(--radius-control);
      background: var(--surface);
      color: var(--text);
      font: var(--font-caption);
      cursor: pointer;
    }
    .palette[aria-pressed='true'] {
      border-color: var(--accent);
      box-shadow: 0 0 0 1px var(--accent);
    }
    .sample {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 66px;
      border-radius: 6px;
      padding: var(--space-2);
      gap: var(--space-2);
    }
    .sample-card {
      width: 60%;
      padding: var(--space-2);
      border-radius: 4px;
      display: grid;
      gap: var(--space-2);
    }
    .sample-card span {
      height: 5px;
      border-radius: 2px;
    }
    .sample-card span:last-child {
      width: 60%;
      height: 10px;
    }
    .swatches {
      display: grid;
      grid-template-columns: repeat(2, 12px);
      gap: 4px;
    }
    i {
      width: 12px;
      height: 12px;
      border: 1px solid #8886;
      border-radius: 3px;
    }
    .check {
      position: absolute;
      right: 10px;
      bottom: 8px;
      color: var(--accent);
    }
    .done {
      width: auto;
      float: right;
    }
  `,
})
export class FlThemePicker {
  readonly palette = input.required<string>();
  readonly dark = input.required<boolean>();
  readonly select = output<{ palette: string; dark: boolean }>();
  readonly palettes = palettes;
  readonly dialog = viewChild.required<FlDialog>('dialog');
  currentName() {
    return `${palettes.find((theme) => theme.id === this.palette())?.name} · ${this.dark() ? 'Escuro' : 'Claro'}`;
  }
  color(token: string) {
    return `var(--palette-${this.dark() ? 'dark' : 'light'}-${token})`;
  }
  show() {
    this.dialog().show();
  }
}
