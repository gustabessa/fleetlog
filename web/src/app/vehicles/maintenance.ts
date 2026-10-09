import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlButton, FlCard, FlField, FlInput } from '../ui';
import { today } from './readings';
import { RealEntry } from './fuel';
const empty = (currency: string) => ({ date: today(), title: '', km: '', amount: '', currency });
interface Item {
  refId: number;
  name: string;
  brand: string;
  code: string;
  unit: string;
  kind: string;
  quantity: string;
  unitPrice: string;
  currency: string;
}
@Component({
  selector: 'fl-maintenance',
  imports: [FormsModule, FlButton, FlCard, FlField, FlInput],
  template: `<section flCard>
    <h3>Manutenções</h3>
    <fl-field controlId="item-search" label="Pesquisar preços de item"
      ><input
        flInput
        id="item-search"
        [ngModel]="itemQuery"
        (ngModelChange)="itemQuery = $event" /></fl-field
    ><button flButton (click)="loadReferences()">Buscar itens</button>
    @for (ref of references(); track ref.refId) {
      <button flButton (click)="showPrices(ref.refId)">Preços de {{ ref.name }}</button>
    }
    @if (prices(); as list) {
      @for (price of list; track $index) {
        <p>
          {{ price.date }} · {{ price.vehicle }} · {{ price.name }} · {{ price.unitPrice }}
          {{ price.currency }} / {{ price.unit }} · {{ price.quantity }}
        </p>
      }
      @if (!list.length) {
        <p>Nenhum preço histórico para este item.</p>
      }
    }
    @if (error()) {
      <p role="alert">{{ error() }}</p>
      <button flButton (click)="load()">Recarregar manutenções</button>
    }
    @if (loading()) {
      <p role="status">Carregando manutenções…</p>
    }
    <button flButton (click)="start()">Registrar manutenção</button>
    @if (open()) {
      <form ngNativeValidate (ngSubmit)="save()">
        <fieldset [disabled]="busy()">
          <fl-field controlId="service-date" label="Data da manutenção"
            ><input
              flInput
              id="service-date"
              name="date"
              type="date"
              [(ngModel)]="form.date"
              required
          /></fl-field>
          <fl-field controlId="service-title" label="Descrição da manutenção (opcional)"
            ><input
              flInput
              id="service-title"
              name="title"
              [(ngModel)]="form.title"
              maxlength="500"
          /></fl-field>
          <fl-field controlId="service-km" label="Odômetro da manutenção (opcional)"
            ><input
              flInput
              id="service-km"
              name="km"
              [(ngModel)]="form.km"
              inputmode="decimal"
              pattern="[0-9]+([.,][0-9]{1,3})?"
          /></fl-field>
          <fl-field controlId="service-currency" label="Moeda da manutenção"
            ><select flInput id="service-currency" name="currency" [(ngModel)]="form.currency">
              @for (c of currencies; track c) {
                <option>{{ c }}</option>
              }
            </select></fl-field
          >
          <fl-field controlId="service-mode" label="Modo de valor"
            ><select
              flInput
              id="service-mode"
              name="mode"
              [ngModel]="mode"
              (ngModelChange)="switchMode($event)"
            >
              <option value="direct">Total direto</option>
              <option value="detailed">Peças e mão de obra</option>
            </select></fl-field
          >
          @if (mode === 'direct') {
            <fl-field controlId="service-amount" label="Total da manutenção"
              ><input
                flInput
                id="service-amount"
                name="amount"
                [(ngModel)]="form.amount"
                inputmode="decimal"
                required
                pattern="[0-9]+([.,][0-9]{1,6})?"
            /></fl-field>
          } @else {
            @for (item of items; track $index; let i = $index) {
              <section>
                <h4>Item {{ i + 1 }}</h4>
                <fl-field [controlId]="'item-ref-' + i" label="Reutilizar referência"
                  ><select
                    flInput
                    [id]="'item-ref-' + i"
                    [name]="'ref' + i"
                    [ngModel]="item.refId"
                    (ngModelChange)="reuse(i, $event)"
                  >
                    <option [ngValue]="0">Novo item</option>
                    @for (ref of references(); track ref.refId) {
                      <option [ngValue]="ref.refId">
                        {{ ref.name }} · {{ ref.brand }} · {{ ref.code }}
                      </option>
                    }
                  </select></fl-field
                >
                <fl-field [controlId]="'item-name-' + i" label="Nome do item"
                  ><input
                    flInput
                    [id]="'item-name-' + i"
                    [name]="'itemName' + i"
                    [(ngModel)]="item.name"
                    required
                    maxlength="200"
                    [readonly]="item.refId !== 0"
                /></fl-field>
                <fl-field [controlId]="'item-brand-' + i" label="Marca do item"
                  ><input
                    flInput
                    [id]="'item-brand-' + i"
                    [name]="'itemBrand' + i"
                    [(ngModel)]="item.brand"
                    maxlength="100"
                    [readonly]="item.refId !== 0"
                /></fl-field>
                <fl-field [controlId]="'item-code-' + i" label="Código do item"
                  ><input
                    flInput
                    [id]="'item-code-' + i"
                    [name]="'itemCode' + i"
                    [(ngModel)]="item.code"
                    maxlength="100"
                    [readonly]="item.refId !== 0"
                /></fl-field>
                <fl-field [controlId]="'item-kind-' + i" label="Tipo do item"
                  ><select
                    flInput
                    [id]="'item-kind-' + i"
                    [name]="'itemKind' + i"
                    [(ngModel)]="item.kind"
                  >
                    <option value="part">Peça</option>
                    <option value="labor">Mão de obra</option>
                  </select></fl-field
                >
                <fl-field [controlId]="'item-unit-' + i" label="Unidade"
                  ><select
                    flInput
                    [id]="'item-unit-' + i"
                    [name]="'itemUnit' + i"
                    [(ngModel)]="item.unit"
                    [disabled]="item.refId !== 0"
                  >
                    <option value="unit">Unidade</option>
                    <option value="liter">Litro</option>
                    <option value="hour">Hora</option>
                  </select></fl-field
                >
                <fl-field [controlId]="'item-quantity-' + i" label="Quantidade"
                  ><input
                    flInput
                    [id]="'item-quantity-' + i"
                    [name]="'itemQuantity' + i"
                    [(ngModel)]="item.quantity"
                    required
                    inputmode="decimal"
                    pattern="[0-9]+([.,][0-9]{1,6})?"
                /></fl-field>
                <fl-field [controlId]="'item-price-' + i" label="Preço unitário"
                  ><input
                    flInput
                    [id]="'item-price-' + i"
                    [name]="'itemPrice' + i"
                    [(ngModel)]="item.unitPrice"
                    required
                    inputmode="decimal"
                    pattern="[0-9]+([.,][0-9]{1,6})?"
                /></fl-field>
                <fl-field [controlId]="'item-currency-' + i" label="Moeda do item"
                  ><select
                    flInput
                    [id]="'item-currency-' + i"
                    [name]="'itemCurrency' + i"
                    [(ngModel)]="item.currency"
                  >
                    @for (c of currencies; track c) {
                      <option>{{ c }}</option>
                    }
                  </select></fl-field
                >
                <button flButton type="button" (click)="items.splice(i, 1)">Remover item</button>
              </section>
            }
            <button flButton type="button" (click)="addItem()">
              Adicionar peça ou mão de obra
            </button>
            <fl-field controlId="service-discount" label="Desconto"
              ><input
                flInput
                id="service-discount"
                name="discount"
                [(ngModel)]="discount"
                inputmode="decimal"
                pattern="[0-9]+([.,][0-9]{1,6})?"
            /></fl-field>
            <fl-field
              controlId="service-adjustment"
              label="Ajuste"
              hint="Use valor negativo para reduzir o total."
              ><input
                flInput
                id="service-adjustment"
                name="adjustment"
                [(ngModel)]="adjustment"
                inputmode="decimal"
                pattern="-?[0-9]+([.,][0-9]{1,6})?"
            /></fl-field>
            <p>
              Todos os preços, desconto e ajuste usam a moeda da manutenção. O total é calculado ao
              salvar.
            </p>
          }
          <button flButton type="submit" [loading]="busy()">Salvar manutenção</button
          ><button flButton type="button" (click)="open.set(false)">Cancelar</button>
        </fieldset>
      </form>
    }
    @for (e of entries(); track e.id) {
      <article>
        <p>
          {{ e.date }} · {{ e.title }} · {{ e.amount }} {{ e.currency }}
          @if (e.km) {
            · {{ e.km }} km
          }
        </p>
        <p>{{ e.author }}</p>
        <button flButton (click)="edit(e)" [disabled]="busy()">Editar manutenção</button
        ><button flButton (click)="remove(e)" [disabled]="busy()">Excluir manutenção</button>
      </article>
    }
    @if (!loading() && !entries().length) {
      <p>Nenhuma manutenção registrada.</p>
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
export class Maintenance {
  readonly endpoint = input.required<string>();
  readonly currency = input('BRL');
  readonly changed = output<void>();
  readonly entries = signal<RealEntry[]>([]);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly open = signal(false);
  readonly currencies = ['BRL', 'USD', 'EUR', 'GBP', 'ARS', 'CAD', 'JPY', 'CHF'];
  form = empty('BRL');
  editing: number | null = null;
  mode = 'direct';
  items: Item[] = [];
  discount = '0';
  adjustment = '0';
  itemQuery = '';
  readonly references = signal<Item[]>([]);
  readonly prices = signal<
    | {
        date: string;
        vehicle: string;
        name: string;
        unitPrice: string;
        currency: string;
        unit: string;
        quantity: string;
      }[]
    | null
  >(null);
  private get catalog() {
    return this.endpoint().split('/vehicles/')[0] + '/items';
  }
  async loadReferences() {
    try {
      const r = await fetch(this.catalog + '?q=' + encodeURIComponent(this.itemQuery), {
        cache: 'no-store',
      });
      if (!r.ok) throw Error();
      this.references.set(await r.json());
    } catch {
      this.error.set('Não foi possível buscar itens.');
    }
  }
  async showPrices(id: number) {
    try {
      const r = await fetch(this.catalog + '/' + id + '/prices', { cache: 'no-store' });
      if (!r.ok) throw Error();
      this.prices.set(await r.json());
    } catch {
      this.error.set('Não foi possível consultar preços.');
    }
  }
  addItem() {
    this.items.push({
      refId: 0,
      name: '',
      brand: '',
      code: '',
      unit: 'unit',
      kind: 'part',
      quantity: '1',
      unitPrice: '',
      currency: this.form.currency,
    });
  }
  reuse(index: number, id: number) {
    const ref = this.references().find((r) => r.refId === Number(id));
    if (ref)
      Object.assign(this.items[index], {
        refId: ref.refId,
        name: ref.name,
        brand: ref.brand,
        code: ref.code,
        unit: ref.unit,
      });
    else this.items[index].refId = 0;
  }
  switchMode(mode: string) {
    if (mode === this.mode) return;
    if (!confirm('Trocar o modo de valor? O total ou detalhamento em edição será descartado.'))
      return;
    this.mode = mode;
    this.items = [];
    this.form.amount = '';
    this.discount = '0';
    this.adjustment = '0';
    if (mode === 'detailed') {
      this.addItem();
      void this.loadReferences();
    }
  }

  ngOnInit() {
    void this.load();
  }
  start() {
    this.form = empty(this.currency());
    this.mode = 'direct';
    this.items = [];
    this.discount = '0';
    this.adjustment = '0';
    this.editing = null;
    this.error.set('');
    this.open.set(true);
  }
  edit(e: RealEntry) {
    this.form = {
      date: e.date,
      title: e.title,
      amount: e.amount,
      currency: e.currency,
      km: e.km ?? '',
    };
    this.mode = e.details.mode ?? 'direct';
    this.items = structuredClone(e.details.items ?? []);
    this.discount = e.details.discount ?? '0';
    this.adjustment = e.details.adjustment ?? '0';
    void this.loadReferences();
    this.editing = e.id;
    this.error.set('');
    this.open.set(true);
  }
  async load() {
    this.loading.set(true);
    try {
      const r = await fetch(this.endpoint() + '/service', { cache: 'no-store' });
      if (!r.ok) throw Error();
      this.entries.set(await r.json());
    } catch {
      this.error.set('Não foi possível carregar manutenções.');
    } finally {
      this.loading.set(false);
    }
  }
  save() {
    return this.mutate(this.editing ? 'PUT' : 'POST', this.editing, {
      ...this.form,
      amount: this.form.amount.replace(',', '.'),
      km: this.form.km ? this.form.km.replace(',', '.') : null,
      service: {
        mode: this.mode,
        items:
          this.mode === 'detailed'
            ? this.items.map((i) => ({
                ...i,
                quantity: i.quantity.replace(',', '.'),
                unitPrice: i.unitPrice.replace(',', '.'),
              }))
            : [],
        discount: this.mode === 'detailed' ? this.discount.replace(',', '.') : '0',
        adjustment: this.mode === 'detailed' ? this.adjustment.replace(',', '.') : '0',
      },
    });
  }
  remove(e: RealEntry) {
    if (confirm('Excluir esta manutenção? O odômetro será recalculado e a auditoria preservada.'))
      void this.mutate('DELETE', e.id, {});
  }
  private async mutate(method: string, id: number | null, body: object) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const r = await fetch(this.endpoint() + '/service' + (id ? '/' + id : ''), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        this.error.set(
          r.status === 409
            ? 'Odômetro incoerente com as demais leituras.'
            : 'Não foi possível salvar manutenção. Confira os campos e tente novamente.',
        );
        return;
      }
      this.open.set(false);
      await this.load();
      this.changed.emit();
    } catch {
      this.error.set('Não foi possível salvar manutenção.');
    } finally {
      this.busy.set(false);
    }
  }
}
