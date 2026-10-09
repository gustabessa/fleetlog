import { FlLoading } from '../ui/loading';
import { FlMoneyInput } from '../ui/money-input';
import { Component, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlButton, FlCard, FlField, FlInput, FlDateRange, FlPieChart, FlEntryList } from '../ui';
import { formatMoneyDecimal, formatNumber } from '../ui/format';
import { RealEntry } from './fuel';
interface HistoryEntry extends RealEntry {
  vehicleName: string;
  costKind: string;
}
interface Result {
  items: HistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  totals: { currency: string; amount: string }[];
  byType: { currency: string; kind: string; amount: string }[];
  byMonth: { currency: string; month: string; amount: string }[];
  byVehicle: { currency: string; vehicleId: number; vehicle: string; amount: string }[];
  distances: { vehicleId: number; vehicle: string; distance: string | null }[];
}
@Component({
  selector: 'fl-real-history',
  imports: [
    FlLoading,
    FlMoneyInput,
    FormsModule,
    FlButton,
    FlCard,
    FlField,
    FlInput,
    FlDateRange,
    FlPieChart,
    FlEntryList,
  ],
  template: ` <section flCard>
    <h2>{{ mode() === 'costs' ? 'Custos reais' : 'Histórico da garagem' }}</h2>
    <form ngNativeValidate (ngSubmit)="apply()">
      <div class="filters" [class.history-filters]="mode() === 'history'">
        <fl-field class="search-field" controlId="real-query" label="Buscar lançamentos"
          ><input flInput id="real-query" name="query" [(ngModel)]="query" maxlength="200"
        /></fl-field>
        <fl-field controlId="real-vehicle" label="Filtrar veículo"
          ><select flInput id="real-vehicle" name="vehicle" [(ngModel)]="vehicleId">
            <option value="">Todos os veículos</option>
            @for (v of vehicles(); track v.id) {
              <option [value]="v.id">{{ v.name }}</option>
            }
          </select></fl-field
        >
        <fl-field controlId="real-kind" label="Filtrar tipo"
          ><select flInput id="real-kind" name="kind" [(ngModel)]="kind">
            <option value="">Todos os tipos</option>
            @for (k of kinds; track k.id) {
              <option [value]="k.id">{{ k.name }}</option>
            }
          </select></fl-field
        >
        @if (mode() === 'costs') {
          <fl-field controlId="real-currency" label="Filtrar moeda"
            ><select flInput id="real-currency" name="currency" [(ngModel)]="selectedCurrency">
              @if (mode() === 'history') {
                <option value="">Todas as moedas</option>
              }
              @for (c of currencies; track c) {
                <option>{{ c }}</option>
              }
            </select></fl-field
          >
        }
        <fl-field class="price-field" controlId="real-price" label="Preço aproximado"
          ><input
            flInput
            flMoney
            [currency]="selectedCurrency || currency()"
            id="real-price"
            name="price"
            inputmode="decimal"
            [(ngModel)]="price"
        /></fl-field>
        <fl-date-range
          id="real-range"
          label="Período dos lançamentos"
          [from]="from"
          [to]="to"
          (rangeChange)="setRange($event)"
        />
      </div>
      <div class="filter-actions">
        <button flButton variant="primary" type="submit" [loading]="loading()">
          Aplicar filtros</button
        ><button flButton variant="ghost" type="button" (click)="clear()">Limpar filtros</button
        ><span>Preço: faixa de ±10% em {{ selectedCurrency || currency() }}.</span>
      </div>
    </form>
    @if (error()) {
      <p role="alert">{{ error() }}</p>
      <button flButton (click)="load()">Tentar novamente</button>
    }
    @if (loading()) {
      <fl-loading animate.enter="loading-enter" animate.leave="loading-leave"
        >Carregando lançamentos…</fl-loading
      >
    }
    @if (data(); as d) {
      @if (d.total === 0 && (mode() !== 'costs' || !chartData()?.total)) {
        <div class="empty-state">
          <span class="empty-icon" aria-hidden="true">{{ mode() === 'costs' ? '◔' : '≡' }}</span>
          <h3>
            {{ mode() === 'costs' ? 'Sem gastos neste período' : 'Nenhum lançamento encontrado' }}
          </h3>
          <p>
            {{
              mode() === 'costs'
                ? 'Os custos aparecem aqui quando você registra abastecimentos, manutenções ou despesas.'
                : 'Registre um lançamento no veículo ou ajuste os filtros para consultar seu histórico.'
            }}
          </p>
        </div>
      } @else {
        <div class="totals">
          @for (total of d.totals; track total.currency) {
            <p>
              Total em {{ total.currency }}:
              <strong>{{ money(total.amount, total.currency) }}</strong>
            </p>
          }
        </div>
        @if (mode() === 'costs') {
          @if (chartData(); as chart) {
            <h3>Gastos por tipo</h3>
            <fl-pie-chart
              [categories]="categories()"
              [selected]="kind"
              (choose)="kind = kind === $event ? '' : $event; apply()"
            />
            <h3>Evolução mensal</h3>
            @for (row of chart.byMonth; track row.currency + row.month) {
              <p>{{ row.month }} · {{ money(row.amount, row.currency) }}</p>
              <meter
                [value]="ratio(row.amount, chart.totals, row.currency)"
                min="0"
                max="1"
                [attr.aria-label]="row.month + ' ' + row.currency"
              ></meter>
            }
            <h3>Gastos por veículo</h3>
            @for (row of chart.byVehicle; track row.currency + row.vehicleId) {
              <p>{{ row.vehicle }} · {{ money(row.amount, row.currency) }}</p>
              <meter
                [value]="ratio(row.amount, chart.totals, row.currency)"
                min="0"
                max="1"
                [attr.aria-label]="row.vehicle + ' ' + row.currency"
              ></meter>
            }
            <h3>Distância observada</h3>
            @for (row of chart.distances; track row.vehicleId) {
              <p>
                {{ row.vehicle }}:
                {{
                  row.distance === null
                    ? 'Dados insuficientes: são necessárias duas leituras no período'
                    : number(row.distance) + ' km entre leituras do período'
                }}
              </p>
            }
          }
        }
        <fl-entry-list [entries]="list()" [vehicles]="tags()" />
        <div class="pagination">
          <p role="status">{{ d.total }} lançamentos</p>
          @if (pages() > 1) {
            <span>Página {{ page }} de {{ pages() }}</span>
            <button flButton (click)="page = page - 1; load()" [disabled]="loading() || page <= 1">
              Página anterior</button
            ><button
              flButton
              (click)="page = page + 1; load()"
              [disabled]="loading() || page >= pages()"
            >
              Próxima página
            </button>
          }
        </div>
      }
    }
  </section>`,
  styles: `
    .filters {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--space-3);
      margin-bottom: var(--space-4);
    }
    section > h2 {
      margin-top: 0;
      margin-bottom: var(--space-5);
    }
    fl-date-range {
      grid-column: span 2;
    }
    .history-filters {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .history-filters fl-date-range {
      grid-column: auto;
    }
    .search-field {
      grid-column: span 2;
    }
    .filter-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      padding-bottom: var(--space-5);
      border-bottom: 1px solid var(--line);
    }
    .filter-actions span {
      font: var(--font-caption);
      color: var(--muted);
    }
    .empty-state {
      padding: var(--space-10) var(--space-5);
      text-align: center;
      max-width: 480px;
      margin: auto;
    }
    .empty-state h3 {
      margin: var(--space-4) 0 var(--space-2);
    }
    .empty-state p {
      margin: 0;
    }
    .empty-icon {
      display: inline-grid;
      place-items: center;
      width: 52px;
      height: 52px;
      border-radius: 16px;
      background: var(--soft);
      color: var(--accent);
      font-size: 28px;
    }
    .pagination {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      margin-top: var(--space-5);
    }
    .pagination p {
      margin-right: auto;
    }
    @media (max-width: 700px) {
      .filters,
      .history-filters {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .search-field {
        grid-column: span 2;
      }
      fl-date-range,
      .history-filters fl-date-range {
        grid-column: span 2;
      }
      .filter-actions span {
        flex-basis: 100%;
      }
    }
    @media (max-width: 420px) {
      .filters,
      .history-filters {
        grid-template-columns: 1fr;
      }
      .search-field,
      fl-date-range,
      .history-filters fl-date-range {
        grid-column: auto;
      }
    }
  `,
})
export class RealHistory {
  readonly garageId = input.required<number>();
  readonly currency = input('BRL');
  readonly mode = input<'history' | 'costs'>('history');
  readonly error = signal('');
  readonly loading = signal(false);
  readonly chartData = signal<Result | null>(null);
  readonly data = signal<Result | null>(null);
  readonly vehicles = signal<{ id: number; name: string; plate: string; tagColor?: string }[]>([]);
  readonly currencies = ['BRL', 'USD', 'EUR', 'GBP', 'ARS', 'CAD', 'JPY', 'CHF'];
  readonly kinds = [
    { id: 'fuel', name: 'Abastecimentos' },
    { id: 'service', name: 'Manutenções' },
    { id: 'documentation', name: 'Documentação' },
    { id: 'insurance', name: 'Seguro' },
    { id: 'other', name: 'Outros' },
  ];
  query = '';
  vehicleId = '';
  kind = '';
  selectedCurrency = '';
  price = '';
  from = '';
  to = '';
  page = 1;
  private request: AbortController | null = null;
  readonly money = formatMoneyDecimal;
  number = (value: string) => formatNumber(Number(value));
  readonly pages = computed(() => Math.max(1, Math.ceil((this.data()?.total ?? 0) / 25)));
  readonly tags = computed(() =>
    this.vehicles().map((v) => ({
      name: v.name,
      plate: v.plate,
      tagColor: v.tagColor ?? '#087e83',
    })),
  );
  readonly list = computed(
    () =>
      this.data()?.items.map((e) => ({
        id: e.id,
        vehicle: this.vehicles().findIndex((v) => v.id === e.vehicleId),
        title: e.title,
        detail: this.detail(e),
        date: e.date,
        isoDate: e.date,
        km: e.km ? this.number(e.km) + ' km' : 'Sem leitura de km',
        cents: 0,
        amount: e.amount,
        currency: e.currency,
        kind: e.costKind,
      })) ?? [],
  );
  readonly categories = computed(() => {
    const d = this.chartData() ?? this.data();
    if (!d) return [];
    const rows = d.byType.filter((r) => r.currency === this.selectedCurrency);
    const total = rows.reduce((n, r) => n + Number(r.amount), 0);
    return rows.map((r) => ({
      kind: r.kind,
      label: this.kinds.find((k) => k.id === r.kind)?.name ?? r.kind,
      amount: Number(r.amount),
      percent: total ? (Number(r.amount) / total) * 100 : 0,
      moneyLabel: this.money(r.amount, r.currency),
    }));
  });
  ngOnChanges() {
    if (
      !this.selectedCurrency ||
      (this.mode() === 'costs' && !this.currencies.includes(this.selectedCurrency))
    )
      this.selectedCurrency = this.currency();
    this.page = 1;
    void this.load();
  }
  ngOnDestroy() {
    this.request?.abort();
  }
  setRange(range: { from: string; to: string }) {
    this.from = range.from;
    this.to = range.to;
  }
  apply() {
    this.page = 1;
    void this.load();
  }
  clear() {
    this.query = '';
    this.vehicleId = '';
    this.kind = '';
    this.price = '';
    this.from = '';
    this.to = '';
    this.selectedCurrency = this.mode() === 'costs' ? this.currency() : '';
    this.apply();
  }
  detail(e: HistoryEntry) {
    if (e.kind === 'fuel')
      return `${e.details.fuel} · ${e.details.liters} L · ${e.details.full ? 'Tanque cheio' : 'Tanque parcial'}`;
    if (e.kind === 'service')
      return e.details.mode === 'detailed'
        ? `${e.details.items.length} itens · Peças e mão de obra`
        : 'Total direto';
    return this.kinds.find((k) => k.id === e.costKind)?.name ?? e.costKind;
  }
  ratio(amount: string, totals: Result['totals'], currency: string) {
    const total = totals.find((t) => t.currency === currency);
    return total && Number(total.amount) > 0 ? Number(amount) / Number(total.amount) : 0;
  }
  async load() {
    this.request?.abort();
    const request = new AbortController();
    this.request = request;
    this.error.set('');
    this.loading.set(true);
    if (
      (this.from && this.to && this.from > this.to) ||
      (this.mode() === 'costs' && this.price && !this.selectedCurrency)
    ) {
      this.error.set(
        this.mode() === 'costs' && this.price && !this.selectedCurrency
          ? 'Selecione uma moeda para filtrar preço.'
          : 'O início do período deve vir antes do fim.',
      );
      this.loading.set(false);
      this.data.set(null);
      return;
    }
    try {
      const query = new URLSearchParams({
        page: String(this.page),
        q: this.query,
        vehicleId: this.vehicleId,
        kind: this.kind,
        currency:
          this.mode() === 'costs' || this.price ? this.selectedCurrency || this.currency() : '',
        from: this.from,
        to: this.to,
        price: this.price.replace(',', '.'),
      });
      const base = `/api/garages/${this.garageId()}`;
      const [a, b] = await Promise.all([
        fetch(base + '/history?' + query, { cache: 'no-store', signal: request.signal }),
        fetch(base + '/vehicles?includeArchived=true', {
          cache: 'no-store',
          signal: request.signal,
        }),
      ]);
      if (!a.ok || !b.ok) throw Error();
      const [data, vehicles] = await Promise.all([a.json(), b.json()]);
      if (this.request !== request) return;
      this.vehicles.set(vehicles);
      this.data.set(data);
      if (this.mode() === 'costs') {
        const chartQuery = new URLSearchParams(query);
        chartQuery.set('kind', '');
        const response = await fetch(base + '/history?' + chartQuery, {
          cache: 'no-store',
          signal: request.signal,
        });
        if (!response.ok) throw Error();
        const chart = await response.json();
        if (this.request === request) this.chartData.set(chart);
      } else this.chartData.set(null);
    } catch {
      if (!request.signal.aborted) {
        this.error.set(
          'Não foi possível carregar o histórico. Confira os filtros e tente novamente.',
        );
        this.data.set(null);
      }
    } finally {
      if (this.request === request) this.loading.set(false);
    }
  }
}
