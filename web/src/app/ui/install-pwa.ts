import { Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { FlButton } from './button';
import { FlDialog } from './dialog';
interface InstallPrompt extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
@Component({
  selector: 'fl-install-pwa',
  imports: [FlButton, FlDialog],
  template: `@if (!installed()) {
    <button
      flButton
      class="install"
      aria-label="Instalar FleetLog"
      [loading]="busy()"
      (click)="install()"
    >
      <span aria-hidden="true">↓</span><span class="label">Instalar</span>
    </button>
    <fl-dialog #help title="Instalar FleetLog">
      @if (apple) {
        <p>
          No Safari, abra o menu Compartilhar e escolha <strong>Adicionar à Tela de Início</strong>.
          Ative “Abrir como App”, se essa opção aparecer.
        </p>
      } @else {
        <p>
          Abra o menu do navegador e procure <strong>Instalar aplicativo</strong> ou
          <strong>Adicionar à tela inicial</strong>.
        </p>
        <p>Se a opção não aparecer, tente abrir o FleetLog no Chrome, Edge ou Safari atualizado.</p>
      }
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
      <button flDialogFooter flButton variant="primary" (click)="help.close()">Entendi</button>
    </fl-dialog>
  }`,
  styles: `
    :host {
      display: contents;
    }
    .install {
      flex-shrink: 0;
    }
    @media (max-width: 600px) {
      .label {
        display: none;
      }
      .install {
        width: var(--control-md);
        padding: 0;
      }
    }
  `,
})
export class FlInstallPwa {
  private readonly displayMode = matchMedia(
    '(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)',
  );
  readonly installed = signal(
    this.displayMode.matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
  );
  readonly busy = signal(false);
  readonly error = signal('');
  readonly apple =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  private prompt: InstallPrompt | null = null;
  private readonly help = viewChild<FlDialog>('help');
  constructor() {
    const before = (event: Event) => {
      event.preventDefault();
      this.prompt = event as InstallPrompt;
    };
    const installed = () => {
      this.prompt = null;
      this.installed.set(true);
    };
    const mode = () =>
      this.installed.set(
        this.displayMode.matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone === true,
      );
    window.addEventListener('beforeinstallprompt', before);
    window.addEventListener('appinstalled', installed);
    this.displayMode.addEventListener('change', mode);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('beforeinstallprompt', before);
      window.removeEventListener('appinstalled', installed);
      this.displayMode.removeEventListener('change', mode);
    });
  }
  async install() {
    if (this.busy()) return;
    this.error.set('');
    if (!this.prompt) {
      this.help()?.show();
      return;
    }
    const prompt = this.prompt;
    this.prompt = null;
    this.busy.set(true);
    try {
      await prompt.prompt();
    } catch {
      this.error.set('Não foi possível abrir a instalação. Use o menu do navegador.');
      this.help()?.show();
    } finally {
      this.busy.set(false);
    }
  }
}
