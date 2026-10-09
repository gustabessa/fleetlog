let nextFormId = 0;
import { FlTablePager, TablePaging } from '../ui/table-pager';
import { FlIcon } from '../ui/icon';
import { FlDialog } from '../ui/dialog';
import { Confirmation } from '../ui/confirmation';
import { FlMoneyInput } from '../ui/money-input';
import { formatMoneyDecimal, formatDecimal, decimalInput } from '../ui/format';
import { Component, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlCheckbox, FlButton, FlCard, FlField, FlInput } from '../ui';
import { today } from './readings';
export interface RealEntry {
  id: number;
  date: string;
  title: string;
  amount: string;
  currency: string;
  km: string | null;
  details: any;
  kind: string;
  author: string;
  vehicleId: number;
}
const empty = (currency: string) => ({
  date: today(),
  amount: '',
  currency,
  km: '',
  liters: '',
  unitPrice: '',
  fuel: 'Gasolina comum',
  full: true,
  incomplete: false,
});
@Component({
  host: { '[class.quick-editor]': 'autoOpen()' },
  selector: 'fl-fuel',
  imports: [
    FlTablePager,
    FlIcon,
    FlDialog,
    FlMoneyInput,
    FlCheckbox,
    FormsModule,
    FlButton,
    FlCard,
    FlField,
    FlInput,
  ],
  template: ` <section flCard>
      <h3>Abastecimentos</h3>
      @if (error()) {
        <p role="alert">{{ error() }}</p>
        <button flButton (click)="load()">Recarregar abastecimentos</button>
      }
      @if (loading()) {
        <p role="status">Carregando abastecimentos…</p>
      }
      <button flButton (click)="start()">Registrar abastecimento</button>

      @if (entries().length) {
        <div class="record-table">
          <table>
            <thead>
              <tr>
                <th>Data / combustível</th>
                <th>Volume / km</th>
                <th>Valor</th>
                <th>Consumo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of pager.slice(entries()); track entry.id) {
                <tr>
                  <td>
                    {{ entry.date
                    }}<small
                      >{{ entry.details.fuel }} ·
                      {{ entry.details.full ? 'Tanque cheio' : 'Parcial' }}</small
                    ><small>{{ entry.author }}</small>
                  </td>
                  <td>
                    {{ decimal(entry.details.liters) }} L<small
                      >{{ decimal(entry.km ?? '0') }} km</small
                    >
                  </td>
                  <td class="amount">{{ money(entry.amount, entry.currency) }}</td>
                  <td>
                    @if (consumption(entry.id); as c) {
                      <span>{{ c.kmPerLiter ? c.kmPerLiter + ' km/L' : status(c.status) }}</span>
                    }
                  </td>
                  <td>
                    <div class="row-actions">
                      <button
                        flButton
                        size="icon"
                        (click)="edit(entry)"
                        [disabled]="busy()"
                        aria-label="Editar abastecimento"
                        title="Editar abastecimento"
                      >
                        <fl-icon name="edit" /></button
                      ><button
                        flButton
                        size="icon"
                        variant="ghost"
                        (click)="remove(entry)"
                        [disabled]="busy()"
                        aria-label="Excluir abastecimento"
                        title="Excluir abastecimento"
                      >
                        <fl-icon name="delete" />
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      <fl-table-pager
        label="Abastecimentos"
        [total]="entries().length"
        [page]="pager.current(entries().length)"
        [size]="pager.size()"
        (pageChange)="pager.page.set($event)"
        (sizeChange)="pager.resize($event)"
      />
      @if (!loading() && !entries().length) {
        <p>Nenhum abastecimento registrado.</p>
      }
    </section>
    <fl-dialog #editor size="lg" title="Abastecimento" (closed)="closed.emit()"
      ><form [id]="formId" ngNativeValidate (ngSubmit)="save()">
        <fieldset [disabled]="busy()">
          <fl-field controlId="fuel-date" label="Data do abastecimento"
            ><input flInput id="fuel-date" name="date" type="date" [(ngModel)]="form.date" required
          /></fl-field>
          <fl-field controlId="fuel-kind" label="Combustível"
            ><input
              flInput
              id="fuel-kind"
              name="fuel"
              [(ngModel)]="form.fuel"
              required
              maxlength="100"
          /></fl-field>
          <fl-field controlId="fuel-liters" label="Litros"
            ><input
              flInput
              id="fuel-liters"
              name="liters"
              inputmode="decimal"
              [(ngModel)]="form.liters"
              (ngModelChange)="recalculateFuel()"
              required
              pattern="(0|[1-9][0-9]{0,11})([.,][0-9]{1,6})?"
          /></fl-field>
          <fl-field controlId="fuel-km" label="Odômetro do abastecimento (km)"
            ><input
              flInput
              id="fuel-km"
              name="km"
              inputmode="decimal"
              [(ngModel)]="form.km"
              required
              pattern="(0|[1-9][0-9]{0,8})([.,][0-9]{1,3})?"
          /></fl-field>
          <fl-field controlId="fuel-currency" label="Moeda do abastecimento"
            ><select flInput id="fuel-currency" name="currency" [(ngModel)]="form.currency">
              @for (c of currencies; track c) {
                <option>{{ c }}</option>
              }
            </select></fl-field
          >
          <fl-field
            controlId="fuel-amount"
            label="Total pago"
            hint="Total e preço por litro são calculados entre si conforme os litros informados."
            ><input
              flInput
              flMoney
              [currency]="form.currency"
              id="fuel-amount"
              name="amount"
              inputmode="decimal"
              [(ngModel)]="form.amount"
              (ngModelChange)="priceChanged('amount', $event)"
          /></fl-field>
          <fl-field controlId="fuel-unit" label="Preço por litro"
            ><input
              flInput
              flMoney
              [currency]="form.currency"
              id="fuel-unit"
              name="unitPrice"
              inputmode="decimal"
              [(ngModel)]="form.unitPrice"
              (ngModelChange)="priceChanged('unitPrice', $event)"
          /></fl-field>
          <fl-checkbox
            ><input name="full" type="checkbox" [(ngModel)]="form.full" /> Tanque cheio</fl-checkbox
          >
          <fl-checkbox
            ><input name="incomplete" type="checkbox" [(ngModel)]="form.incomplete" /> Houve
            abastecimento não registrado neste intervalo</fl-checkbox
          >
        </fieldset>
      </form>
      <div flDialogFooter class="fl-dialog-actions">
        <button flButton type="button" (click)="editor.close()" [disabled]="busy()">Cancelar</button
        ><button flButton variant="primary" type="submit" [attr.form]="formId" [loading]="busy()">
          Salvar abastecimento
        </button>
      </div>
      <p role="alert" [hidden]="!error()">{{ error() }}</p></fl-dialog
    >`,
  styles: `
    :host(.quick-editor) > section {
      display: none;
    }

    section {
      margin-top: var(--space-5);
    }
    fieldset {
      border: 0;
      padding: 0;
      display: grid;
      gap: var(--space-3);
    }
    article {
      border-top: 1px solid var(--line);
      margin-top: var(--space-4);
    }
  `,
})
export class Fuel {
  readonly formId = 'fuel-form-' + nextFormId++;
  readonly pager = new TablePaging();
  readonly editor = viewChild.required<FlDialog>('editor');
  readonly autoOpen = input(false);
  readonly closed = output<void>();
  ngAfterViewInit() {
    if (this.autoOpen()) this.start();
  }
  private priceBasis: 'amount' | 'unitPrice' = 'amount';
  priceChanged(field: 'amount' | 'unitPrice', value: string) {
    this.priceBasis = field;
    this.form[field] = value;
    this.recalculateFuel();
  }
  recalculateFuel() {
    const parse = (value: string) => {
      const m = /^(\d{1,12})(?:\.(\d{0,6}))?$/.exec(value.replace(',', '.'));
      return m ? BigInt(m[1]) * 1000000n + BigInt((m[2] ?? '').padEnd(6, '0')) : null;
    };
    const liters = parse(this.form.liters);
    const source = parse(this.form[this.priceBasis]);
    if (liters === null || liters <= 0n || source === null) return;
    const digits = this.priceBasis === 'amount' ? 6 : this.form.currency === 'JPY' ? 0 : 2;
    let n: bigint;
    let d: bigint;
    if (this.priceBasis === 'amount') {
      n = source * 1000000n;
      d = liters;
    } else {
      n = source * liters;
      d = 10n ** BigInt(12 - digits);
    }
    const q = (n + d / 2n) / d;
    const raw = q.toString().padStart(digits + 1, '0');
    this.form[this.priceBasis === 'amount' ? 'unitPrice' : 'amount'] = digits
      ? raw.slice(0, -digits) + '.' + raw.slice(-digits)
      : raw;
  }
  readonly confirmation = inject(Confirmation);
  readonly decimal = formatDecimal;
  readonly money = formatMoneyDecimal;
  readonly endpoint = input.required<string>();
  readonly currency = input('BRL');
  readonly changed = output<void>();
  readonly entries = signal<RealEntry[]>([]);
  readonly consumptions = signal<{ entryId: number; status: string; kmPerLiter: string | null }[]>(
    [],
  );
  readonly open = signal(false);
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly currencies = ['BRL', 'USD', 'EUR', 'GBP', 'ARS', 'CAD', 'JPY', 'CHF'];
  form = empty('BRL');
  editing: number | null = null;
  ngOnInit() {
    if (!this.autoOpen()) void this.load();
  }
  start() {
    this.form = empty(this.currency());
    this.editing = null;
    this.error.set('');
    this.open.set(true);
    this.editor().show();
  }
  edit(e: RealEntry) {
    this.form = {
      date: e.date,
      amount: decimalInput(e.amount),
      currency: e.currency,
      km: e.km ? decimalInput(e.km) : '',
      ...e.details,
      liters: decimalInput(e.details.liters),
      unitPrice: '',
    };
    this.priceBasis = 'amount';
    this.recalculateFuel();
    this.editing = e.id;
    this.error.set('');
    this.open.set(true);
    this.editor().show();
  }
  consumption(id: number) {
    return this.consumptions().find((c) => c.entryId === id);
  }
  status(s: string) {
    return (
      {
        valid: 'Consumo do intervalo',
        reference: 'Referência inicial, sem consumo calculado',
        partial: 'Intervalo aberto, sem consumo calculado',
        incomplete: 'Intervalo incompleto, sem consumo calculado',
        invalid: 'Intervalo sem distância válida',
      } as Record<string, string>
    )[s];
  }
  async load() {
    this.loading.set(true);
    try {
      const [a, b] = await Promise.all([
        fetch(this.endpoint() + '/fuel', { cache: 'no-store' }),
        fetch(this.endpoint() + '/consumption', { cache: 'no-store' }),
      ]);
      if (!a.ok || !b.ok) throw Error();
      this.entries.set(await a.json());
      this.consumptions.set(await b.json());
    } catch {
      this.error.set('Não foi possível carregar abastecimentos.');
    } finally {
      this.loading.set(false);
    }
  }
  async save() {
    const normalize = (v: string) => v.replace(',', '.');
    const f = this.form;
    return this.mutate(this.editing ? 'PUT' : 'POST', this.editing, {
      date: f.date,
      amount: normalize(f.amount),
      currency: f.currency,
      km: normalize(f.km),
      fuel: {
        liters: normalize(f.liters),
        unitPrice: this.priceBasis === 'unitPrice' ? normalize(f.unitPrice) : '',
        fuel: f.fuel,
        full: f.full,
        incomplete: f.incomplete,
      },
    });
  }
  async remove(e: RealEntry) {
    if (
      await this.confirmation.ask(
        'Excluir este abastecimento? O próximo intervalo de consumo será marcado como incompleto.',
      )
    )
      void this.mutate('DELETE', e.id, {});
  }
  private async mutate(method: string, id: number | null, body: object) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const r = await fetch(this.endpoint() + '/fuel' + (id ? '/' + id : ''), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        this.error.set(
          r.status === 409
            ? 'Odômetro incoerente com as demais leituras.'
            : r.status === 400
              ? 'Confira litros, preço e moeda. Total e preço por litro devem corresponder.'
              : 'Não foi possível salvar abastecimento.',
        );
        return;
      }
      this.open.set(false);
      await this.load();
      this.changed.emit();
      this.editor().close();
    } catch {
      this.error.set('Não foi possível salvar abastecimento.');
    } finally {
      this.busy.set(false);
    }
  }
}
