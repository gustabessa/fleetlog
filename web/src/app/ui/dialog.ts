import { Component, ElementRef, input, output, viewChild } from '@angular/core';
import { FlButton } from './button';
@Component({
  selector: 'fl-dialog',
  imports: [FlButton],
  template: `<dialog
    #native
    [attr.aria-label]="title()"
    [attr.data-size]="size()"
    (click)="backdrop($event)"
    (close)="closed.emit()"
  >
    <header>
      <h2>{{ title() }}</h2>
      <button
        flButton
        variant="ghost"
        size="icon"
        [attr.aria-label]="'Fechar ' + title()"
        (click)="close()"
      >
        ×
      </button>
    </header>
    <div class="body"><ng-content /></div>
    <footer><ng-content select="[flDialogFooter]" /></footer>
  </dialog>`,
  styles: `
    :host {
      display: contents;
    }
    dialog[data-size='lg'] {
      width: 720px;
    }
    dialog[data-size='sm'] {
      width: 420px;
    }

    dialog {
      width: 520px;
      max-width: calc(100vw - 32px);
      max-height: calc(100dvh - 32px);
      padding: 0;
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--line);
      border-radius: var(--radius-card);
      box-shadow: 0 24px 80px #0005;
      overflow: hidden;
    }
    dialog[open] {
      display: flex;
      flex-direction: column;
    }
    dialog::backdrop {
      background: #0008;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-6);
      border-bottom: 1px solid var(--line);
      flex-shrink: 0;
    }
    h2 {
      margin: 0;
    }
    .body {
      min-height: 0;
      overflow: auto;
      overscroll-behavior: contain;
      padding: var(--space-5) var(--space-6);
    }
    footer {
      padding: var(--space-4) var(--space-6);
      border-top: 1px solid var(--line);
      flex-shrink: 0;
    }
    footer:empty {
      display: none;
    }
  `,
})
export class FlDialog {
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly title = input.required<string>();
  readonly closed = output<void>();
  private readonly native = viewChild.required<ElementRef<HTMLDialogElement>>('native');
  show() {
    this.native().nativeElement.showModal();
  }
  close() {
    this.native().nativeElement.close();
  }
  backdrop(event: MouseEvent) {
    const dialog = this.native().nativeElement;
    const rect = dialog.getBoundingClientRect();
    if (
      event.target === dialog &&
      (event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom)
    )
      this.close();
  }
}
