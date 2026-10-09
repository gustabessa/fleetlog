import { Injectable, signal, Component, inject, viewChild, afterEveryRender } from '@angular/core';
import { FlDialog } from './dialog';
import { FlButton } from './button';
@Injectable({ providedIn: 'root' })
export class Confirmation {
  readonly request = signal<{ message: string; resolve: (answer: boolean) => void } | null>(null);
  ask(message: string): Promise<boolean> {
    if (this.request()) return Promise.resolve(false);
    return new Promise((resolve) => this.request.set({ message, resolve }));
  }
  answer(value: boolean) {
    const request = this.request();
    this.request.set(null);
    request?.resolve(value);
  }
}
@Component({
  selector: 'fl-confirmation',
  imports: [FlDialog, FlButton],
  template: `<fl-dialog #dialog title="Confirmar ação" (closed)="confirmation.answer(false)"
    ><p>{{ confirmation.request()?.message }}</p>
    <div flDialogFooter class="fl-dialog-actions">
      <button flButton (click)="confirmation.answer(false)">Cancelar</button
      ><button flButton variant="primary" (click)="confirmation.answer(true)">Confirmar</button>
    </div></fl-dialog
  >`,
  styles: `
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
    }
    p {
      margin: 0;
      color: var(--text);
    }
  `,
})
export class FlConfirmation {
  readonly confirmation = inject(Confirmation);
  readonly dialog = viewChild.required<FlDialog>('dialog');
  private opened = false;
  constructor() {
    afterEveryRender(() => {
      if (this.confirmation.request() && !this.opened) {
        this.opened = true;
        this.dialog().show();
      } else if (!this.confirmation.request() && this.opened) {
        this.opened = false;
        this.dialog().close();
      }
    });
  }
}
