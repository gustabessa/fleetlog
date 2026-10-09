import { formatMoneyDecimal, formatDecimal, decimalInput } from '../ui/format';
import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlButton, FlCard, FlField, FlInput } from '../ui';
import { today } from './readings';
import { RealEntry } from './fuel';
interface Trade {
  date: string;
  amount: string;
  currency: string;
  party: string;
}
const trade = (currency: string): Trade => ({ date: today(), amount: '', currency, party: '' });
@Component({
  selector: 'fl-vehicle-records',
  imports: [FormsModule, FlButton, FlCard, FlField, FlInput],
  template: ` @if (error()) {
      <p role="alert">{{ error() }}</p>
      <button flButton (click)="load()">Recarregar informações</button>
    }
    @if (loading()) {
      <p role="status">Carregando informações adicionais…</p>
    }
    <section flCard>
      <h3>Notas do veículo</h3>
      <form ngNativeValidate (ngSubmit)="saveNote()">
        <fl-field controlId="note-content" label="Anotação">
          <textarea
            flInput
            id="note-content"
            name="note"
            [(ngModel)]="note"
            required
            maxlength="20000"
            [disabled]="busy()"
          ></textarea></fl-field
        ><button flButton [loading]="busy()" type="submit">
          {{ noteId ? 'Salvar anotação' : 'Adicionar anotação' }}
        </button>
        @if (noteId) {
          <button flButton type="button" (click)="noteId = null; note = ''">Cancelar edição</button>
        }
      </form>
      @for (n of notes(); track n.id) {
        <article>
          <p class="note">{{ n.content }}</p>
          <p>{{ n.author }}</p>
          <button flButton (click)="noteId = n.id; note = n.content">Editar anotação</button
          ><button flButton (click)="deleteNote(n.id)">Excluir anotação</button>
        </article>
      }
    </section>
    <section flCard>
      <h3>Compra e venda</h3>
      <form ngNativeValidate (ngSubmit)="saveOwnership()">
        <fieldset [disabled]="busy()">
          <label
            ><input name="purchaseEnabled" type="checkbox" [(ngModel)]="purchaseEnabled" /> Informar
            compra</label
          >
          @if (purchaseEnabled) {
            <fl-field controlId="purchase-date" label="Data de compra"
              ><input
                flInput
                id="purchase-date"
                name="purchaseDate"
                type="date"
                [(ngModel)]="purchase.date"
                required /></fl-field
            ><fl-field controlId="purchase-amount" label="Valor de compra"
              ><input
                flInput
                id="purchase-amount"
                name="purchaseAmount"
                [(ngModel)]="purchase.amount"
                required
                inputmode="decimal"
                pattern="(0|[1-9][0-9]{0,11})([.,][0-9]{1,6})?" /></fl-field
            ><fl-field controlId="purchase-currency" label="Moeda da compra"
              ><select
                flInput
                id="purchase-currency"
                name="purchaseCurrency"
                [(ngModel)]="purchase.currency"
              >
                @for (c of currencies; track c) {
                  <option>{{ c }}</option>
                }
              </select></fl-field
            ><fl-field controlId="purchase-party" label="Proprietário anterior (opcional)"
              ><input
                flInput
                id="purchase-party"
                name="purchaseParty"
                [(ngModel)]="purchase.party"
                maxlength="200"
            /></fl-field>
          }
          <label
            ><input name="saleEnabled" type="checkbox" [(ngModel)]="saleEnabled" /> Informar
            venda</label
          >
          @if (saleEnabled) {
            <fl-field controlId="sale-date" label="Data de venda"
              ><input
                flInput
                id="sale-date"
                name="saleDate"
                type="date"
                [(ngModel)]="sale.date"
                required /></fl-field
            ><fl-field controlId="sale-amount" label="Valor de venda"
              ><input
                flInput
                id="sale-amount"
                name="saleAmount"
                [(ngModel)]="sale.amount"
                required
                inputmode="decimal"
                pattern="(0|[1-9][0-9]{0,11})([.,][0-9]{1,6})?" /></fl-field
            ><fl-field controlId="sale-currency" label="Moeda da venda"
              ><select flInput id="sale-currency" name="saleCurrency" [(ngModel)]="sale.currency">
                @for (c of currencies; track c) {
                  <option>{{ c }}</option>
                }
              </select></fl-field
            ><fl-field controlId="sale-party" label="Novo proprietário (opcional)"
              ><input
                flInput
                id="sale-party"
                name="saleParty"
                [(ngModel)]="sale.party"
                maxlength="200"
            /></fl-field>
          }
          <p>
            A venda arquiva o veículo e preserva seu histórico. Corrigir/remover a venda restaura o
            veículo à garagem ativa.
          </p>
          <button flButton type="submit" [loading]="busy()">Salvar compra e venda</button>
        </fieldset>
      </form>
    </section>
    <section flCard>
      <h3>Documentação e outras despesas</h3>
      <button flButton (click)="startExpense()">Registrar despesa</button>
      @if (expenseOpen()) {
        <form ngNativeValidate (ngSubmit)="saveExpense()">
          <fieldset [disabled]="busy()">
            <fl-field controlId="expense-date" label="Data da despesa"
              ><input
                flInput
                id="expense-date"
                name="expenseDate"
                type="date"
                [(ngModel)]="expense.date"
                required
            /></fl-field>
            <fl-field controlId="expense-title" label="Descrição da despesa"
              ><input
                flInput
                id="expense-title"
                name="expenseTitle"
                [(ngModel)]="expense.title"
                maxlength="500"
            /></fl-field>
            <fl-field controlId="expense-type" label="Tipo de despesa"
              ><select flInput id="expense-type" name="expenseType" [(ngModel)]="expense.category">
                <option value="documentation">Documentação</option>
                <option value="insurance">Seguro</option>
                <option value="other">Outros</option>
              </select></fl-field
            >
            @if (expense.category === 'documentation') {
              <fl-field controlId="expense-subtype" label="Tipo de documentação"
                ><select
                  flInput
                  id="expense-subtype"
                  name="expenseSubtype"
                  [(ngModel)]="expense.subtype"
                >
                  <option value="ipva">IPVA</option>
                  <option value="licensing">Licenciamento</option>
                  <option value="transfer">Transferência</option>
                  <option value="fees">Taxas</option>
                  <option value="other">Outros</option>
                </select></fl-field
              >
            }
            <fl-field controlId="expense-amount" label="Valor da despesa"
              ><input
                flInput
                id="expense-amount"
                name="expenseAmount"
                [(ngModel)]="expense.amount"
                inputmode="decimal"
                required
                pattern="(0|[1-9][0-9]{0,11})([.,][0-9]{1,6})?"
            /></fl-field>
            <fl-field controlId="expense-currency" label="Moeda da despesa"
              ><select
                flInput
                id="expense-currency"
                name="expenseCurrency"
                [(ngModel)]="expense.currency"
              >
                @for (c of currencies; track c) {
                  <option>{{ c }}</option>
                }
              </select></fl-field
            >
            <button flButton type="submit" [loading]="busy()">Salvar despesa</button
            ><button flButton type="button" (click)="expenseOpen.set(false)">Cancelar</button>
          </fieldset>
        </form>
      }
      @for (e of expenses(); track e.id) {
        <article>
          <p>{{ e.date }} · {{ e.title }} · {{ money(e.amount, e.currency) }} · {{ e.author }}</p>
          <button flButton (click)="editExpense(e)">Editar despesa</button
          ><button flButton (click)="deleteExpense(e)">Excluir despesa</button>
        </article>
      }
      @if (!loading() && !expenses().length) {
        <p>Nenhuma despesa registrada.</p>
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
    .note {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
  `,
})
export class VehicleRecords {
  readonly decimal = formatDecimal;
  readonly money = formatMoneyDecimal;
  readonly endpoint = input.required<string>();
  readonly currency = input('BRL');
  readonly changed = output<void>();
  readonly error = signal('');
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly notes = signal<{ id: number; content: string; author: string }[]>([]);
  readonly expenses = signal<RealEntry[]>([]);
  readonly expenseOpen = signal(false);
  readonly currencies = ['BRL', 'USD', 'EUR', 'GBP', 'ARS', 'CAD', 'JPY', 'CHF'];
  note = '';
  noteId: number | null = null;
  purchaseEnabled = false;
  saleEnabled = false;
  purchase = trade('BRL');
  sale = trade('BRL');
  expenseId: number | null = null;
  expense = {
    date: today(),
    title: '',
    amount: '',
    currency: 'BRL',
    category: 'documentation',
    subtype: 'licensing',
  };
  ngOnInit() {
    this.purchase = trade(this.currency());
    this.sale = trade(this.currency());
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [a, b, c] = await Promise.all(
        ['notes', 'ownership', 'expense'].map((p) =>
          fetch(this.endpoint() + '/' + p, { cache: 'no-store' }),
        ),
      );
      if (!a.ok || !b.ok || !c.ok) throw Error();
      this.notes.set(await a.json());
      const o = await b.json();
      this.purchaseEnabled = !!o.purchase;
      this.saleEnabled = !!o.sale;
      if (o.purchase) this.purchase = { ...o.purchase, amount: decimalInput(o.purchase.amount) };
      if (o.sale) this.sale = { ...o.sale, amount: decimalInput(o.sale.amount) };
      this.expenses.set(await c.json());
    } catch {
      this.error.set('Não foi possível carregar informações do veículo.');
    } finally {
      this.loading.set(false);
    }
  }
  saveNote() {
    return this.mutate(
      'notes' + (this.noteId ? '/' + this.noteId : ''),
      this.noteId ? 'PUT' : 'POST',
      { content: this.note },
    );
  }
  deleteNote(id: number) {
    if (confirm('Excluir esta anotação?')) void this.mutate('notes/' + id, 'DELETE', {});
  }
  saveOwnership() {
    if (!confirm('Salvar compra/venda? O estado de arquivamento acompanhará a venda informada.'))
      return;
    const normalize = (t: Trade) => ({ ...t, amount: t.amount.replace(',', '.') });
    return this.mutate('ownership', 'PUT', {
      purchase: this.purchaseEnabled ? normalize(this.purchase) : null,
      sale: this.saleEnabled ? normalize(this.sale) : null,
    });
  }
  startExpense() {
    this.expenseId = null;
    this.expense = {
      date: today(),
      title: '',
      amount: '',
      currency: this.currency(),
      category: 'documentation',
      subtype: 'licensing',
    };
    this.expenseOpen.set(true);
  }
  editExpense(e: RealEntry) {
    this.expenseId = e.id;
    this.expense = {
      date: e.date,
      title: e.title,
      amount: decimalInput(e.amount),
      currency: e.currency,
      ...e.details,
    };
    this.expenseOpen.set(true);
  }
  saveExpense() {
    const e = this.expense;
    return this.mutate(
      'expense' + (this.expenseId ? '/' + this.expenseId : ''),
      this.expenseId ? 'PUT' : 'POST',
      {
        date: e.date,
        title: e.title,
        amount: e.amount.replace(',', '.'),
        currency: e.currency,
        expense: { category: e.category, subtype: e.category === 'documentation' ? e.subtype : '' },
      },
    );
  }
  deleteExpense(e: RealEntry) {
    if (confirm('Excluir esta despesa?')) void this.mutate('expense/' + e.id, 'DELETE', {});
  }
  private async mutate(path: string, method: string, body: object) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const r = await fetch(this.endpoint() + '/' + path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        this.error.set(
          r.status === 400
            ? 'Confira os campos: valores, moeda e datas devem ser válidos.'
            : 'Não foi possível salvar. Tente novamente.',
        );
        return;
      }
      this.note = '';
      this.noteId = null;
      this.expenseOpen.set(false);
      await this.load();
      this.changed.emit();
    } catch {
      this.error.set('Não foi possível salvar.');
    } finally {
      this.busy.set(false);
    }
  }
}
