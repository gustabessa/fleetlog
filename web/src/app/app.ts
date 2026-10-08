import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly preview = signal(false);
  readonly screen = signal<'garage' | 'vehicle' | 'history' | 'costs'>('garage');
  readonly selected = signal(0);
  readonly vehicles = [
    {
      name: 'Honda Civic',
      version: 'EXL · 2.0 · 2020',
      plate: 'ABC1D23',
      km: '48.250',
      color: 'blue',
      total: 'R$ 842,90',
      consumption: '11,8 km/l',
    },
    {
      name: 'Volkswagen Polo',
      version: 'Highline · 1.0 TSI · 2023',
      plate: 'DEF4G56',
      km: '21.680',
      color: 'teal',
      total: 'R$ 486,50',
      consumption: '13,2 km/l',
    },
  ];
  readonly entries = [
    {
      title: 'Abastecimento',
      detail: 'Gasolina comum · 42,5 litros · Tanque cheio',
      date: '05 out. 2026',
      km: '48.250 km',
      value: 'R$ 263,50',
      kind: 'fuel',
    },
    {
      title: 'Troca de óleo e filtro',
      detail: 'Manutenção · Oficina Central',
      date: '28 set. 2026',
      km: '47.900 km',
      value: 'R$ 380,00',
      kind: 'service',
    },
    {
      title: 'Abastecimento',
      detail: 'Gasolina comum · 38 litros · Tanque cheio',
      date: '21 set. 2026',
      km: '47.748 km',
      value: 'R$ 235,60',
      kind: 'fuel',
    },
    {
      title: 'Licenciamento anual',
      detail: 'Documentação · Exercício 2026',
      date: '12 set. 2026',
      km: '47.320 km',
      value: 'R$ 167,74',
      kind: 'document',
    },
  ];
  openVehicle(index: number) {
    this.selected.set(index);
    this.screen.set('vehicle');
  }
  closePreview() {
    this.preview.set(false);
    this.screen.set('garage');
  }

  readonly user = signal<{ username: string; currency: string } | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly authError = signal('');
  username = '';
  password = '';
  async loadUser() {
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' });
      if (response.ok) this.user.set(await response.json());
      else if (response.status !== 401)
        this.authError.set('Não foi possível conectar ao FleetLog.');
    } catch {
      this.authError.set('Não foi possível conectar ao FleetLog.');
    } finally {
      this.loading.set(false);
    }
  }
  async login() {
    if (this.busy()) return;
    this.busy.set(true);
    this.authError.set('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: this.username, password: this.password }),
      });
      if (!response.ok) {
        this.authError.set(
          response.status === 401
            ? 'Usuário ou senha incorretos.'
            : response.status === 429
              ? 'Muitas tentativas. Aguarde um minuto.'
              : 'Não foi possível entrar. Tente novamente.',
        );
        return;
      }
      this.user.set(await response.json());
    } catch {
      this.authError.set('Não foi possível conectar ao FleetLog.');
    } finally {
      this.password = '';
      this.busy.set(false);
    }
  }
  async logout() {
    if (this.busy()) return;
    this.busy.set(true);
    this.authError.set('');
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (response.ok) {
        this.user.set(null);
        this.closePreview();
      } else this.authError.set('Não foi possível sair. Tente novamente.');
    } catch {
      this.authError.set('Não foi possível conectar ao FleetLog.');
    } finally {
      this.busy.set(false);
    }
  }
  readonly updateReady = signal(false);
  readonly updateBroken = signal(false);
  private readonly updates = inject(SwUpdate);
  readonly dark = signal(
    localStorage.getItem('fleetlog.theme') === 'dark' ||
      (!localStorage.getItem('fleetlog.theme') &&
        matchMedia('(prefers-color-scheme: dark)').matches),
  );
  constructor() {
    this.applyTheme();
    void this.loadUser();
    if (this.updates.isEnabled) {
      this.updates.versionUpdates.pipe(takeUntilDestroyed()).subscribe((event) => {
        if (event.type === 'VERSION_READY') this.updateReady.set(true);
      });
      this.updates.unrecoverable
        .pipe(takeUntilDestroyed())
        .subscribe(() => this.updateBroken.set(true));
    }
  }
  reload() {
    location.reload();
  }
  toggleTheme() {
    this.dark.update((value) => !value);
    localStorage.setItem('fleetlog.theme', this.dark() ? 'dark' : 'light');
    this.applyTheme();
  }
  private applyTheme() {
    document.documentElement.dataset['theme'] = this.dark() ? 'dark' : 'light';
  }
}
