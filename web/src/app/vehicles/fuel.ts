import { formatMoneyDecimal, formatDecimal, decimalInput } from '../ui/format';
import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlButton, FlCard, FlField, FlInput } from '../ui';
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
  selector: 'fl-fuel',
  imports: [FormsModule, FlButton, FlCard, FlField, FlInput],
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
    @if (open()) {
      <form ngNativeValidate (ngSubmit)="save()">
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
            hint="Informe o total ou o preço por litro. Se informar ambos, eles devem corresponder."
            ><input
              flInput
              id="fuel-amount"
              name="amount"
              inputmode="decimal"
              [(ngModel)]="form.amount"
              pattern="(0|[1-9][0-9]{0,11})([.,][0-9]{1,6})?"
          /></fl-field>
          <fl-field controlId="fuel-unit" label="Preço por litro"
            ><input
              flInput
              id="fuel-unit"
              name="unitPrice"
              inputmode="decimal"
              [(ngModel)]="form.unitPrice"
              pattern="(0|[1-9][0-9]{0,11})([.,][0-9]{1,6})?"
          /></fl-field>
          <label><input name="full" type="checkbox" [(ngModel)]="form.full" /> Tanque cheio</label>
          <label
            ><input name="incomplete" type="checkbox" [(ngModel)]="form.incomplete" /> Houve
            abastecimento não registrado neste intervalo</label
          >
          <button flButton type="submit" [loading]="busy()">Salvar abastecimento</button
          ><button flButton type="button" (click)="open.set(false)">Cancelar</button>
        </fieldset>
      </form>
    }
    @for (entry of entries(); track entry.id) {
      <article>
        <p>
          {{ entry.date }} · {{ entry.details.fuel }} · {{ decimal(entry.details.liters) }} L ·
          {{ money(entry.amount, entry.currency) }} · {{ decimal(entry.km ?? '0') }} km
        </p>
        <p>{{ entry.details.full ? 'Tanque cheio' : 'Tanque parcial' }} · {{ entry.author }}</p>
        @if (consumption(entry.id); as c) {
          <p>
            {{ status(c.status) }}
            @if (c.kmPerLiter) {
              · {{ c.kmPerLiter }} km/L
            }
          </p>
        }
        <button flButton (click)="edit(entry)" [disabled]="busy()">Editar abastecimento</button
        ><button flButton (click)="remove(entry)" [disabled]="busy()">Excluir abastecimento</button>
      </article>
    }
    @if (!loading() && !entries().length) {
      <p>Nenhum abastecimento registrado.</p>
    }
  </section>`,
  styles: `
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
    button {
      margin: var(--space-2);
    }
  `,
})
export class Fuel {
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
    void this.load();
  }
  start() {
    this.form = empty(this.currency());
    this.editing = null;
    this.error.set('');
    this.open.set(true);
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
    this.editing = e.id;
    this.error.set('');
    this.open.set(true);
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
        unitPrice: normalize(f.unitPrice),
        fuel: f.fuel,
        full: f.full,
        incomplete: f.incomplete,
      },
    });
  }
  remove(e: RealEntry) {
    if (
      confirm(
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
    } catch {
      this.error.set('Não foi possível salvar abastecimento.');
    } finally {
      this.busy.set(false);
    }
  }
}
