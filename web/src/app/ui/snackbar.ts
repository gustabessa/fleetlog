import {
  Component,
  Injectable,
  inject,
  signal,
  DestroyRef,
  ElementRef,
  viewChild,
  afterEveryRender,
} from '@angular/core';
import { FlLoading } from './loading';
import { FlButton } from './button';
@Injectable({ providedIn: 'root' })
export class Snackbar {
  readonly closing = signal(false);
  readonly duration = signal(2500);
  private removalTimer: ReturnType<typeof setTimeout> | undefined;
  readonly reading = signal(false);
  readonly readClosing = signal(false);
  private readRemovalTimer: ReturnType<typeof setTimeout> | undefined;
  readonly revision = signal(0);
  private activeReads = 0;
  private readTimer: ReturnType<typeof setTimeout> | undefined;
  readonly message = signal('');
  readonly error = signal(false);
  private timer: ReturnType<typeof setTimeout> | undefined;
  show(message: string, error = false) {
    this.revision.update((n) => n + 1);
    clearTimeout(this.timer);
    clearTimeout(this.removalTimer);
    this.closing.set(false);
    this.duration.set(error ? 8000 : 2500);
    this.error.set(error);
    this.message.set(message);
    this.timer = setTimeout(() => this.dismiss(), this.duration());
  }
  dismiss() {
    if (this.closing() || !this.message()) return;
    clearTimeout(this.timer);
    this.closing.set(true);
    this.removalTimer = setTimeout(() => {
      this.message.set('');
      this.closing.set(false);
    }, 180);
  }
  install() {
    const original = window.fetch.bind(window);
    const wrapper: typeof fetch = async (input, init) => {
      const req = input instanceof Request ? input : null;
      const method = (init?.method ?? req?.method ?? 'GET').toUpperCase();
      const url = new URL(req?.url ?? String(input), location.href);
      const mutation =
        url.origin === location.origin &&
        url.pathname.startsWith('/api/') &&
        !url.pathname.startsWith('/api/auth/') &&
        ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
      const read =
        url.origin === location.origin && url.pathname.startsWith('/api/') && method === 'GET';
      if (read && ++this.activeReads === 1) {
        clearTimeout(this.readRemovalTimer);
        this.readClosing.set(false);
        if (!this.reading()) this.readTimer = setTimeout(() => this.reading.set(true), 180);
      }
      try {
        const response = await original(input, init);
        if (mutation)
          this.show(
            response.ok
              ? this.label(url.pathname, method)
              : 'Não foi possível concluir a ação. Confira os dados e tente novamente.',
            !response.ok,
          );
        return response;
      } catch (error) {
        if (mutation && !(error instanceof DOMException && error.name === 'AbortError'))
          this.show('Não foi possível conectar. Tente novamente.', true);
        throw error;
      } finally {
        if (read && --this.activeReads === 0) {
          clearTimeout(this.readTimer);
          if (this.reading()) {
            this.readClosing.set(true);
            this.readRemovalTimer = setTimeout(() => {
              this.reading.set(false);
              this.readClosing.set(false);
            }, 180);
          }
        }
      }
    };
    window.fetch = wrapper;
    inject(DestroyRef).onDestroy(() => {
      if (window.fetch === wrapper) window.fetch = original;
      clearTimeout(this.timer);
      clearTimeout(this.readTimer);
      clearTimeout(this.readRemovalTimer);
      clearTimeout(this.removalTimer);
    });
  }
  private label(path: string, method: string) {
    if (path.endsWith('/complete')) return 'Manutenção vinculada ao lembrete.';
    const name = path.includes('/fuel')
      ? 'Abastecimento'
      : path.includes('/service')
        ? 'Manutenção'
        : path.includes('/reminders')
          ? 'Lembrete'
          : path.includes('/notes')
            ? 'Anotação'
            : path.includes('/readings')
              ? 'Leitura de odômetro'
              : path.includes('/expense')
                ? 'Despesa'
                : path.includes('/image')
                  ? 'Imagem'
                  : path.includes('/profile')
                    ? 'Preferências'
                    : path.includes('/members')
                      ? 'Acesso familiar'
                      : 'Dados';
    const feminine = [
      'Manutenção',
      'Anotação',
      'Leitura de odômetro',
      'Despesa',
      'Imagem',
    ].includes(name);
    const plural = ['Dados', 'Preferências'].includes(name);
    const ending = plural ? (name === 'Preferências' ? 'as' : 'os') : feminine ? 'a' : 'o';
    return name + ' ' + (method === 'DELETE' ? 'excluíd' : 'salv') + ending + '.';
  }
}
@Component({
  selector: 'fl-snackbar',
  imports: [FlButton, FlLoading],
  template: `@if (snack.reading()) {
      <fl-loading class="app-loading" [class.closing]="snack.readClosing()"
        >Carregando dados…</fl-loading
      >
    }
    @if (snack.message()) {
      <div
        #toast
        popover="manual"
        [attr.data-notification]="snack.revision()"
        class="snackbar"
        [class.error]="snack.error()"
        [class.closing]="snack.closing()"
        [attr.role]="snack.error() ? 'alert' : 'status'"
        [attr.aria-live]="snack.error() ? 'assertive' : 'polite'"
      >
        <span>{{ snack.message() }}</span
        ><button flButton size="icon" aria-label="Fechar notificação" (click)="snack.dismiss()">
          ×
        </button>
        @if (!snack.error()) {
          @for (key of [snack.revision()]; track key) {
            <span
              class="countdown"
              aria-hidden="true"
              [style.animation-duration.ms]="snack.duration()"
            ></span>
          }
        }
      </div>
    }`,
  styles: `
    .snackbar {
      position: fixed;
      inset: auto;
      margin: 0;
      bottom: max(20px, env(safe-area-inset-bottom));
      right: 20px;
      z-index: 2000;
      display: flex;
      align-items: center;
      gap: 16px;
      max-width: min(440px, calc(100vw - 32px));
      padding: 12px 16px;
      border-radius: var(--radius-control);
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--accent);
      box-shadow: 0 8px 32px #0004;
      animation: snack-enter 0.18s ease-out;
      font: var(--font-label);
    }
    .snackbar.closing {
      animation: snack-exit 0.18s ease-in forwards;
    }
    .countdown {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 3px;
      border-radius: 0 0 var(--radius-control) var(--radius-control);
      background: var(--accent);
      transform-origin: left;
      animation: snack-countdown linear forwards;
    }
    @keyframes snack-countdown {
      from {
        transform: scaleX(1);
      }
      to {
        transform: scaleX(0);
      }
    }
    @keyframes snack-exit {
      to {
        opacity: 0;
        transform: translateX(12px);
      }
    }
    .snackbar.error {
      border-color: var(--danger);
    }
    @keyframes snack-enter {
      from {
        opacity: 0;
        transform: translateX(12px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
    @media (max-width: 600px) {
      .snackbar {
        right: 16px;
        bottom: max(16px, env(safe-area-inset-bottom));
      }
      .snackbar button {
        min-height: 44px;
        min-width: 44px;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .snackbar,
      .snackbar.closing,
      .countdown {
        animation: none;
      }
    }
  `,
})
export class FlSnackbar {
  readonly toast = viewChild<ElementRef<HTMLDivElement>>('toast');
  private shownRevision = -1;
  constructor() {
    afterEveryRender(() => {
      const el = this.toast()?.nativeElement;
      if (
        el?.showPopover &&
        (!el.matches(':popover-open') || this.shownRevision !== this.snack.revision())
      ) {
        if (el.matches(':popover-open')) el.hidePopover();
        el.showPopover();
        this.shownRevision = this.snack.revision();
      }
    });
  }
  readonly snack = inject(Snackbar);
}
