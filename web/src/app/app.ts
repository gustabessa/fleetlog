import { palettes } from './ui/themes';
import { formatMoney, formatNumber } from './ui/format';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import {
  FlButton,
  FlInput,
  FlField,
  FlCard,
  FlBadge,
  FlStat,
  FlPageHeading,
  FlVehicleCard,
  FlPieChart,
  FlEntryList,
  FlDateRange,
  FlVehicleSelect,
  FlThemePicker,
  FlInstallPwa,
} from './ui';
import { LogEntry } from './ui/entry-list';
import { SwUpdate } from '@angular/service-worker';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    FormsModule,
    FlButton,
    FlInput,
    FlField,
    FlCard,
    FlBadge,
    FlStat,
    FlPageHeading,
    FlVehicleCard,
    FlPieChart,
    FlEntryList,
    FlDateRange,
    FlVehicleSelect,
    FlThemePicker,
    FlInstallPwa,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css', './preview.css'],
})
export class App {
  readonly preview = signal(false);
  readonly screen = signal<'garage' | 'vehicle' | 'history' | 'costs'>('garage');
  readonly selected = signal(0);
  readonly vehicleTagColors = signal(['#316cba', '#087e83']);
  readonly taggedVehicles = computed(() =>
    this.vehicles.map((vehicle, index) => ({
      ...vehicle,
      tagColor: this.vehicleTagColors()[index],
    })),
  );
  setTagColor(color: string) {
    this.vehicleTagColors.update((colors) =>
      colors.map((value, index) => (index === this.selected() ? color : value)),
    );
  }
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
  readonly entries: LogEntry[] = [
    {
      vehicle: 0,
      title: 'Abastecimento',
      detail: 'Gasolina comum · 42,5 litros · Tanque cheio',
      date: '05 out. 2026',
      isoDate: '2026-10-05',
      km: '48.250 km',
      cents: 26350,
      kind: 'fuel',
    },
    {
      vehicle: 1,
      title: 'Abastecimento',
      detail: 'Gasolina comum · 36 litros · Tanque cheio',
      date: '05 out. 2026',
      isoDate: '2026-10-05',
      km: '21.680 km',
      cents: 22300,
      kind: 'fuel',
    },
    {
      vehicle: 0,
      title: 'Troca de óleo e filtro',
      detail: 'Manutenção · Oficina Central',
      date: '28 set. 2026',
      isoDate: '2026-09-28',
      km: '47.900 km',
      cents: 38000,
      kind: 'service',
    },
    {
      vehicle: 0,
      title: 'Abastecimento',
      detail: 'Gasolina comum · 38 litros · Tanque cheio',
      date: '21 set. 2026',
      isoDate: '2026-09-21',
      km: '47.748 km',
      cents: 23560,
      kind: 'fuel',
    },
    {
      vehicle: 0,
      title: 'Licenciamento anual',
      detail: 'Documentação · Exercício 2026',
      date: '12 set. 2026',
      isoDate: '2026-09-12',
      km: '47.320 km',
      cents: 16774,
      kind: 'document',
    },
    {
      vehicle: 1,
      title: 'Revisão periódica',
      detail: 'Manutenção · Oficina Central',
      date: '26 set. 2026',
      isoDate: '2026-09-26',
      km: '21.200 km',
      cents: 24000,
      kind: 'service',
    },
    {
      vehicle: 1,
      title: 'Abastecimento',
      detail: 'Gasolina comum · Tanque cheio',
      date: '20 set. 2026',
      isoDate: '2026-09-20',
      km: '21.050 km',
      cents: 42000,
      kind: 'fuel',
    },
    {
      vehicle: 1,
      title: 'Licenciamento anual',
      detail: 'Documentação · Exercício 2026',
      date: '12 set. 2026',
      isoDate: '2026-09-12',
      km: '20.900 km',
      cents: 16774,
      kind: 'document',
    },
    {
      vehicle: 0,
      title: 'Abastecimento',
      detail: 'Gasolina comum · Tanque cheio',
      date: '06 set. 2026',
      isoDate: '2026-09-06',
      km: '46.850 km',
      cents: 49956,
      kind: 'fuel',
    },
  ].sort((a, b) => b.isoDate.localeCompare(a.isoDate));
  readonly historyText = signal('');
  readonly historyPrice = signal<number | null>(null);
  readonly historyPriceHint = computed(() =>
    this.historyPrice() === null
      ? 'Busca valores até 10% acima ou abaixo.'
      : `${this.money(Math.ceil(this.historyPrice()! * 90))} a ${this.money(Math.floor(this.historyPrice()! * 110))} (±10%)`,
  );
  readonly historyVehicle = signal('all');
  readonly historyKind = signal('all');
  readonly historyFrom = signal('');
  readonly historyTo = signal('');
  readonly costKind = signal('');
  readonly historyRangeInvalid = computed(
    () => !!this.historyFrom() && !!this.historyTo() && this.historyFrom() > this.historyTo(),
  );
  readonly filteredHistory = computed(() => {
    const normalize = (text: string) =>
      text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    const text = normalize(this.historyText().trim());
    return this.historyRangeInvalid()
      ? []
      : this.entries.filter(
          (entry) =>
            (this.historyVehicle() === 'all' ||
              this.vehicles[entry.vehicle].plate === this.historyVehicle()) &&
            (this.historyKind() === 'all' || entry.kind === this.historyKind()) &&
            (this.historyPrice() === null ||
              (entry.cents >= Math.ceil(this.historyPrice()! * 90) &&
                entry.cents <= Math.floor(this.historyPrice()! * 110))) &&
            (!this.historyFrom() || entry.isoDate >= this.historyFrom()) &&
            (!this.historyTo() || entry.isoDate <= this.historyTo()) &&
            (!text ||
              normalize(
                `${entry.title} ${entry.detail} ${this.vehicles[entry.vehicle].name} ${this.vehicles[entry.vehicle].plate}`,
              ).includes(text)),
        );
  });
  clearHistoryFilters() {
    this.historyText.set('');
    this.historyPrice.set(null);
    this.historyVehicle.set('all');
    this.historyKind.set('all');
    this.historyFrom.set('');
    this.historyTo.set('');
  }
  readonly costVehicle = signal('all');
  readonly costFrom = signal('2026-09-01');
  readonly costTo = signal('2026-09-30');
  setCostRange(range: { from: string; to: string }) {
    this.costFrom.set(range.from);
    this.costTo.set(range.to);
  }
  setHistoryRange(range: { from: string; to: string }) {
    this.historyFrom.set(range.from);
    this.historyTo.set(range.to);
  }
  readonly costPeriodLabel = computed(() => {
    const format = (iso: string) => iso.split('-').reverse().join('/');
    return this.costFrom()
      ? `${format(this.costFrom())} — ${this.costTo() ? format(this.costTo()) : 'em diante'}`
      : 'Todo o período';
  });
  readonly costSamples = [
    { vehicle: 0, month: '2026-09', distance: 1492 },
    { vehicle: 1, month: '2026-09', distance: 980 },
    { vehicle: 0, month: '2026-10', distance: 780 },
    { vehicle: 1, month: '2026-10', distance: 504 },
  ];
  readonly periodEntries = computed(() =>
    this.entries.filter(
      (entry) =>
        (!this.costFrom() || entry.isoDate >= this.costFrom()) &&
        (!this.costTo() || entry.isoDate <= this.costTo()) &&
        (this.costVehicle() === 'all' || this.vehicles[entry.vehicle].plate === this.costVehicle()),
    ),
  );
  readonly costEntries = computed(() =>
    this.periodEntries().filter((entry) => !this.costKind() || entry.kind === this.costKind()),
  );
  readonly costKindLabel = computed(
    () =>
      this.costs().categories.find((category) => category.kind === this.costKind())?.label ??
      'Todos os lançamentos',
  );
  readonly costs = computed(() => {
    const fuel = this.periodEntries()
      .filter((entry) => entry.kind === 'fuel')
      .reduce((sum, entry) => sum + entry.cents, 0);
    const service = this.periodEntries()
      .filter((entry) => entry.kind === 'service')
      .reduce((sum, entry) => sum + entry.cents, 0);
    const document = this.periodEntries()
      .filter((entry) => entry.kind === 'document')
      .reduce((sum, entry) => sum + entry.cents, 0);
    // Mock daily mileage: prorate each month's sample for the selected date range.
    const distance = Math.round(
      this.costSamples.reduce((sum, row) => {
        if (this.costVehicle() !== 'all' && this.vehicles[row.vehicle].plate !== this.costVehicle())
          return sum;
        const start = new Date(row.month + '-01T00:00:00Z');
        const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
        const from = this.costFrom()
          ? Math.max(start.getTime(), Date.parse(this.costFrom() + 'T00:00:00Z'))
          : start.getTime();
        const to = this.costTo()
          ? Math.min(end.getTime(), Date.parse(this.costTo() + 'T00:00:00Z'))
          : end.getTime();
        return sum + (row.distance * Math.max(0, (to - from) / 86400000 + 1)) / end.getUTCDate();
      }, 0),
    );
    const total = fuel + service + document;
    return {
      total,
      distance,
      perKm: distance ? total / distance : 0,
      categories: [
        { kind: 'fuel', label: 'Abastecimentos', amount: fuel },
        { kind: 'service', label: 'Manutenção', amount: service },
        { kind: 'document', label: 'Documentação', amount: document },
      ].map((row) => ({ ...row, percent: total ? (row.amount / total) * 100 : 0 })),
    };
  });
  readonly costVehicleLabel = computed(
    () =>
      this.vehicles.find((vehicle) => vehicle.plate === this.costVehicle())?.name ??
      'Todos os veículos',
  );
  readonly money = formatMoney;
  readonly number = formatNumber;
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
  readonly palettes = palettes;
  readonly palette = signal(
    palettes.some((p) => p.id === localStorage.getItem('fleetlog.palette'))
      ? localStorage.getItem('fleetlog.palette')!
      : 'original',
  );
  readonly themeName = computed(
    () =>
      `${palettes.find((p) => p.id === this.palette())?.name} · ${this.dark() ? 'Escuro' : 'Claro'}`,
  );
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
  // TODO: Persist palette and mode in the authenticated user profile via API.
  // Until then, localStorage restores this browser’s selection across reloads.
  selectTheme(theme: { palette: string; dark: boolean }) {
    this.palette.set(theme.palette);
    this.dark.set(theme.dark);
    localStorage.setItem('fleetlog.palette', this.palette());
    localStorage.setItem('fleetlog.theme', this.dark() ? 'dark' : 'light');
    this.applyTheme();
  }
  private applyTheme() {
    document.documentElement.dataset['palette'] = this.palette();
    document.documentElement.dataset['theme'] = this.dark() ? 'dark' : 'light';
  }
}
