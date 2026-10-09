let nextFormId = 0;
import { FlTablePager, TablePaging } from '../ui/table-pager';
import { FlIcon } from '../ui/icon';
import { FlDialog } from '../ui/dialog';
import { Confirmation } from '../ui/confirmation';
import { FlMoneyInput } from '../ui/money-input';
import { formatMoneyDecimal, formatDecimal, decimalInput } from '../ui/format';
import { Component, inject, input, output, signal, viewChild } from '@angular/core';
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
  host: { '[class.quick-editor]': 'autoOpen()' },
  selector: 'fl-maintenance',
  imports: [
    FlTablePager,
    FlIcon,
    FlDialog,
    FlMoneyInput,
    FormsModule,
    FlButton,
    FlCard,
    FlField,
    FlInput,
  ],
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
            {{ price.date }} · {{ price.vehicle }} · {{ price.name }} ·
            {{ decimal(price.unitPrice) }} {{ price.currency }} / {{ unitLabel(price.unit) }} ·
            {{ decimal(price.quantity) }}
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

      @if (entries().length) {
        <div class="record-table">
          <table>
            <thead>
              <tr>
                <th>Data / manutenção</th>
                <th>Odômetro</th>
                <th>Valor</th>
                <th>Composição</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (e of pager.slice(entries()); track e.id) {
                <tr>
                  <td>
                    {{ e.date }}<strong>{{ e.title }}</strong
                    ><small>{{ e.author }}</small>
                  </td>
                  <td>{{ e.km ? decimal(e.km) + ' km' : '—' }}</td>
                  <td class="amount">{{ money(e.amount, e.currency) }}</td>
                  <td>
                    {{
                      e.details.mode === 'detailed'
                        ? e.details.items.length + ' itens'
                        : 'Total direto'
                    }}
                  </td>
                  <td>
                    <div class="row-actions">
                      <button
                        flButton
                        size="icon"
                        (click)="edit(e)"
                        [disabled]="busy()"
                        aria-label="Editar manutenção"
                        title="Editar manutenção"
                      >
                        <fl-icon name="edit" /></button
                      ><button
                        flButton
                        size="icon"
                        variant="ghost"
                        (click)="remove(e)"
                        [disabled]="busy()"
                        aria-label="Excluir manutenção"
                        title="Excluir manutenção"
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
        label="Manutenções"
        [total]="entries().length"
        [page]="pager.current(entries().length)"
        [size]="pager.size()"
        (pageChange)="pager.page.set($event)"
        (sizeChange)="pager.resize($event)"
      />
      @if (!loading() && !entries().length) {
        <p>Nenhuma manutenção registrada.</p>
      }
    </section>
    <fl-dialog #editor size="lg" title="Manutenção" (closed)="closed.emit()"
      ><form [id]="formId" ngNativeValidate (ngSubmit)="save()">
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
              pattern="(0|[1-9][0-9]{0,8})([.,][0-9]{1,3})?"
          /></fl-field>
          <fl-field controlId="service-currency" label="Moeda da manutenção"
            ><select
              flInput
              id="service-currency"
              name="currency"
              [ngModel]="form.currency"
              (ngModelChange)="changeCurrency($event)"
            >
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
                flMoney
                [currency]="form.currency"
                id="service-amount"
                name="amount"
                [(ngModel)]="form.amount"
                inputmode="decimal"
                required
            /></fl-field>
          } @else {
            @for (item of items; track $index; let i = $index) {
              <div class="item-row">
                <div class="item-main">
                  <fl-field [controlId]="'item-ref-' + i" label="Item ou serviço"
                    ><select
                      flInput
                      [id]="'item-ref-' + i"
                      [name]="'ref' + i"
                      [ngModel]="item.refId"
                      (ngModelChange)="reuse(i, $event)"
                    >
                      <option [ngValue]="0">Novo item / serviço</option>
                      @for (ref of references(); track ref.refId) {
                        <option [ngValue]="ref.refId">{{ ref.name }} · {{ ref.brand }}</option>
                      }
                    </select></fl-field
                  >
                  @if (item.refId === 0) {
                    <fl-field [controlId]="'item-name-' + i" label="Nome do item"
                      ><input
                        flInput
                        [id]="'item-name-' + i"
                        [name]="'itemName' + i"
                        [(ngModel)]="item.name"
                        required
                        maxlength="200"
                    /></fl-field>
                  }
                  <button
                    flButton
                    type="button"
                    size="icon"
                    variant="ghost"
                    [attr.aria-label]="'Remover item ' + (i + 1)"
                    (click)="items.splice(i, 1)"
                  >
                    ×
                  </button>
                </div>
                <div class="item-values">
                  <fl-field [controlId]="'item-kind-' + i" label="Tipo"
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
                  <fl-field [controlId]="'item-quantity-' + i" label="Quantidade"
                    ><input
                      flInput
                      [id]="'item-quantity-' + i"
                      [name]="'itemQuantity' + i"
                      [(ngModel)]="item.quantity"
                      required
                      inputmode="decimal"
                      pattern="(0|[1-9][0-9]{0,11})([.,][0-9]{1,6})?"
                  /></fl-field>
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
                  <fl-field [controlId]="'item-price-' + i" label="Preço unitário"
                    ><input
                      flInput
                      flMoney
                      [currency]="form.currency"
                      [id]="'item-price-' + i"
                      [name]="'itemPrice' + i"
                      [(ngModel)]="item.unitPrice"
                      required
                  /></fl-field>
                  <fl-field [controlId]="'item-currency-' + i" label="Moeda do item"
                    ><select
                      flInput
                      [id]="'item-currency-' + i"
                      [name]="'itemCurrency' + i"
                      [ngModel]="form.currency"
                      (ngModelChange)="changeCurrency($event)"
                    >
                      @for (c of currencies; track c) {
                        <option>{{ c }}</option>
                      }
                    </select></fl-field
                  >
                </div>
                @if (item.refId === 0) {
                  <details>
                    <summary>Marca e código (opcionais)</summary>
                    <div class="item-extra">
                      <fl-field [controlId]="'item-brand-' + i" label="Marca do item"
                        ><input
                          flInput
                          [id]="'item-brand-' + i"
                          [name]="'itemBrand' + i"
                          [(ngModel)]="item.brand"
                          maxlength="100" /></fl-field
                      ><fl-field [controlId]="'item-code-' + i" label="Código do item"
                        ><input
                          flInput
                          [id]="'item-code-' + i"
                          [name]="'itemCode' + i"
                          [(ngModel)]="item.code"
                          maxlength="100"
                      /></fl-field>
                    </div>
                  </details>
                }
              </div>
            }

            <button flButton type="button" (click)="addItem()">
              Adicionar peça ou mão de obra
            </button>
            <fl-field controlId="service-discount" label="Desconto"
              ><input
                flInput
                flMoney
                [currency]="form.currency"
                id="service-discount"
                name="discount"
                [(ngModel)]="discount"
                inputmode="decimal"
            /></fl-field>
            <fl-field
              controlId="service-adjustment"
              label="Ajuste"
              hint="Use valor negativo para reduzir o total."
              ><input
                flInput
                flMoney
                [currency]="form.currency"
                id="service-adjustment"
                [allowNegative]="true"
                name="adjustment"
                [(ngModel)]="adjustment"
                inputmode="decimal"
            /></fl-field>
            <p>
              Todos os preços, desconto e ajuste usam a moeda da manutenção. O total é calculado ao
              salvar.
            </p>
          }
        </fieldset>
      </form>
      <div flDialogFooter class="fl-dialog-actions">
        <button flButton type="button" (click)="editor.close()" [disabled]="busy()">Cancelar</button
        ><button flButton variant="primary" type="submit" [attr.form]="formId" [loading]="busy()">
          Salvar manutenção
        </button>
      </div>
      <p role="alert" [hidden]="!error()">{{ error() }}</p></fl-dialog
    >`,
  styles: `
    .item-row {
      grid-column: 1/-1;
      border: 1px solid var(--line);
      border-radius: var(--radius-control);
      padding: var(--space-4);
    }
    .item-main {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: var(--space-3);
      align-items: end;
    }
    .item-values {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-3);
      margin-top: var(--space-3);
    }
    .item-extra {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-3);
      margin-top: var(--space-3);
    }
    summary {
      cursor: pointer;
      color: var(--muted);
      font: var(--font-caption);
      margin-top: var(--space-3);
    }
    .service-total {
      grid-column: 1/-1;
      color: var(--text);
      font-weight: 600;
    }
    @media (max-width: 500px) {
      .item-main {
        grid-template-columns: 1fr auto;
      }
      .item-main fl-field {
        grid-column: 1;
      }
      .item-values {
        grid-template-columns: 1fr 1fr;
      }
    }
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
export class Maintenance {
  readonly formId = 'maintenance-form-' + nextFormId++;
  readonly pager = new TablePaging();
  readonly editor = viewChild.required<FlDialog>('editor');
  readonly autoOpen = input(false);
  readonly closed = output<void>();
  ngAfterViewInit() {
    if (this.autoOpen()) this.start();
  }
  readonly confirmation = inject(Confirmation);
  readonly decimal = formatDecimal;
  readonly money = formatMoneyDecimal;
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
  async switchMode(mode: string) {
    if (mode === this.mode) return;
    if (
      !(await this.confirmation.ask(
        'Trocar o modo de valor? O total ou detalhamento em edição será descartado.',
      ))
    )
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

  changeCurrency(currency: string) {
    this.form.currency = currency;
    for (const item of this.items) item.currency = currency;
  }
  liveTotal() {
    try {
      const scale = (v: string) => {
        const sign = v.startsWith('-') ? -1n : 1n;
        const [w, f = ''] = v.replace(',', '.').replace('-', '').split('.');
        return sign * (BigInt(w || '0') * 1000000n + BigInt(f.padEnd(6, '0')));
      };
      let total =
        this.items.reduce((n, i) => n + scale(i.quantity) * scale(i.unitPrice), 0n) -
        scale(this.discount) * 1000000n +
        scale(this.adjustment) * 1000000n;
      if (total < 0n) return 'Confira desconto/ajuste';
      const digits = this.form.currency === 'JPY' ? 0 : 2;
      const factor = 10n ** BigInt(12 - digits);
      const rounded = (total + factor / 2n) / factor;
      const raw = rounded.toString().padStart(digits + 1, '0');
      return this.money(
        digits ? raw.slice(0, -digits) + '.' + raw.slice(-digits) : raw,
        this.form.currency,
      );
    } catch {
      return 'Preencha os preços';
    }
  }
  unitLabel(unit: string) {
    return (
      ({ unit: 'unidade', liter: 'litro', hour: 'hora' } as Record<string, string>)[unit] ?? unit
    );
  }
  ngOnInit() {
    if (!this.autoOpen()) void this.load();
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
    this.editor().show();
  }
  edit(e: RealEntry) {
    this.form = {
      date: e.date,
      title: e.title,
      amount: decimalInput(e.amount),
      currency: e.currency,
      km: e.km ? decimalInput(e.km) : '',
    };
    this.mode = e.details.mode ?? 'direct';
    this.items = structuredClone(e.details.items ?? []).map((i: Item) => ({
      ...i,
      quantity: decimalInput(i.quantity),
      unitPrice: decimalInput(i.unitPrice),
    }));
    this.discount = decimalInput(e.details.discount ?? '0');
    this.adjustment = decimalInput(e.details.adjustment ?? '0');
    void this.loadReferences();
    this.editing = e.id;
    this.error.set('');
    this.open.set(true);
    this.editor().show();
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
  async remove(e: RealEntry) {
    if (
      await this.confirmation.ask(
        'Excluir esta manutenção? O odômetro será recalculado e a auditoria preservada.',
      )
    )
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
      this.editor().close();
    } catch {
      this.error.set('Não foi possível salvar manutenção.');
    } finally {
      this.busy.set(false);
    }
  }
}
