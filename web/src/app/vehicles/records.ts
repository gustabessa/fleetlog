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
import { RealEntry } from './fuel';
interface Trade {
  date: string;
  amount: string;
  currency: string;
  party: string;
}
const trade = (currency: string): Trade => ({ date: today(), amount: '', currency, party: '' });
@Component({
  host: { '[class.quick-editor]': 'autoOpen()' },
  selector: 'fl-vehicle-records',
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
  template: ` @if (error()) {
      <p role="alert">{{ error() }}</p>
      <button flButton (click)="load()">Recarregar informações</button>
    }
    @if (loading()) {
      <p role="status">Carregando informações adicionais…</p>
    }
    <section flCard>
      <h3>Notas do veículo</h3>
      <button flButton (click)="startNote()">Adicionar anotação</button>
      <div class="notes-table">
        <table>
          <thead>
            <tr>
              <th>Anotação</th>
              <th>Autor</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            @for (n of pager.slice(notes()); track n.id) {
              <tr>
                <td class="note">
                  {{ n.content }}
                  @if (n.imageVersion) {
                    <button
                      flButton
                      variant="ghost"
                      size="sm"
                      (click)="
                        notePreview.set(noteImageURL(n.id, n.imageVersion)); imagePreview.show()
                      "
                    >
                      <img
                        class="note-thumb"
                        [src]="noteImageURL(n.id, n.imageVersion)"
                        alt="Imagem da anotação"
                      />
                    </button>
                  }
                </td>
                <td>{{ n.author }}</td>
                <td>
                  <div class="note-actions">
                    <button
                      flButton
                      size="icon"
                      (click)="editNote(n)"
                      aria-label="Editar anotação"
                      title="Editar anotação"
                    >
                      <fl-icon name="edit" /></button
                    ><button
                      flButton
                      size="icon"
                      variant="ghost"
                      (click)="deleteNote(n.id)"
                      aria-label="Excluir anotação"
                      title="Excluir anotação"
                    >
                      <fl-icon name="delete" />
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="3">Nenhuma anotação registrada.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <fl-table-pager
        label="Anotações"
        [total]="notes().length"
        [page]="pager.current(notes().length)"
        [size]="pager.size()"
        (pageChange)="pager.page.set($event)"
        (sizeChange)="pager.resize($event)"
      />
    </section>
    <section flCard>
      <h3>Compra e venda</h3>
      <form ngNativeValidate (ngSubmit)="saveOwnership()">
        <fieldset [disabled]="busy()">
          <div class="trade-group">
            <fl-checkbox
              ><input name="purchaseEnabled" type="checkbox" [(ngModel)]="purchaseEnabled" />
              Informar compra</fl-checkbox
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
                  flMoney
                  [currency]="purchase.currency"
                  id="purchase-amount"
                  name="purchaseAmount"
                  [(ngModel)]="purchase.amount"
                  required
                  inputmode="decimal" /></fl-field
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
          </div>
          <div class="trade-group">
            <fl-checkbox
              ><input name="saleEnabled" type="checkbox" [(ngModel)]="saleEnabled" /> Informar
              venda</fl-checkbox
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
                  flMoney
                  [currency]="sale.currency"
                  id="sale-amount"
                  name="saleAmount"
                  [(ngModel)]="sale.amount"
                  required
                  inputmode="decimal" /></fl-field
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
          </div>
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

      @for (e of expenses(); track e.id) {
        <article>
          <p>{{ e.date }} · {{ e.title }} · {{ money(e.amount, e.currency) }} · {{ e.author }}</p>
          <button
            flButton
            (click)="editExpense(e)"
            size="icon"
            aria-label="Editar despesa"
            title="Editar despesa"
          >
            <fl-icon name="edit" /></button
          ><button
            flButton
            (click)="deleteExpense(e)"
            size="icon"
            aria-label="Excluir despesa"
            title="Excluir despesa"
          >
            <fl-icon name="delete" />
          </button>
        </article>
      }
      @if (!loading() && !expenses().length) {
        <p>Nenhuma despesa registrada.</p>
      }
    </section>
    <fl-dialog #noteEditor [title]="noteId ? 'Editar anotação' : 'Nova anotação'">
      <form [id]="noteFormId" ngNativeValidate (ngSubmit)="saveNote()">
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
        ><label class="note-image-upload"
          >Imagem opcional<input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            (change)="chooseNoteImage($event)"
            [disabled]="busy()"
        /></label>
        @if (noteImageVersion) {
          <img
            class="note-preview"
            [src]="noteImageURL(noteId!, noteImageVersion)"
            alt="Imagem da anotação"
          />
        }
      </form>
      <div flDialogFooter class="fl-dialog-actions">
        <button flButton type="button" (click)="noteEditor.close()" [disabled]="busy()">
          Cancelar</button
        ><button
          flButton
          variant="primary"
          type="submit"
          [attr.form]="noteFormId"
          [loading]="busy()"
        >
          Salvar anotação
        </button>
      </div>
      <p role="alert" [hidden]="!error()">{{ error() }}</p></fl-dialog
    >
    <fl-dialog #imagePreview title="Imagem da anotação"
      ><img
        [src]="notePreview()"
        alt="Imagem da anotação"
        style="width:100%;max-height:70vh;object-fit:contain"
    /></fl-dialog>
    <fl-dialog #expenseEditor size="lg" title="Despesa" (closed)="closed.emit()"
      ><form [id]="expenseFormId" ngNativeValidate (ngSubmit)="saveExpense()">
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
              flMoney
              [currency]="expense.currency"
              id="expense-amount"
              name="expenseAmount"
              [(ngModel)]="expense.amount"
              inputmode="decimal"
              required
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
        </fieldset>
      </form>
      <div flDialogFooter class="fl-dialog-actions">
        <button flButton type="button" (click)="expenseEditor.close()" [disabled]="busy()">
          Cancelar</button
        ><button
          flButton
          variant="primary"
          type="submit"
          [attr.form]="expenseFormId"
          [loading]="busy()"
        >
          Salvar despesa
        </button>
      </div>
      <p role="alert" [hidden]="!error()">{{ error() }}</p></fl-dialog
    >`,
  styles: `
    .note-image-upload {
      display: grid;
      gap: 8px;
      margin: 12px 0;
    }
    .note-thumb {
      width: 48px;
      height: 48px;
      object-fit: cover;
      border-radius: 6px;
    }
    .note-preview {
      width: 100%;
      max-height: 240px;
      object-fit: contain;
    }
    .trade-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      grid-column: 1/-1;
      border-bottom: 1px solid var(--line);
      padding-bottom: 16px;
    }
    .trade-group fl-checkbox {
      grid-column: 1/-1;
    }
    @media (max-width: 500px) {
      .trade-group {
        grid-template-columns: 1fr;
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
    button {
      margin: 0;
    }
    .notes-table {
      overflow-x: auto;
      margin-top: var(--space-5);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      font: var(--font-label);
      color: var(--muted);
    }
    th,
    td {
      padding: var(--space-3);
      border-bottom: 1px solid var(--line);
      vertical-align: top;
    }
    td:first-child {
      width: 60%;
      min-width: 180px;
    }
    .note-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .note-actions button {
      margin: 0;
    }
    .note {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
  `,
})
export class VehicleRecords {
  readonly noteFormId = 'note-form-' + nextFormId++;
  readonly expenseFormId = 'expense-form-' + nextFormId++;
  readonly pager = new TablePaging();
  readonly noteEditor = viewChild.required<FlDialog>('noteEditor');
  readonly notePreview = signal('');
  readonly encode = encodeURIComponent;
  noteFile: File | null = null;
  noteImageVersion = '';
  startNote() {
    this.noteId = null;
    this.note = '';
    this.noteFile = null;
    this.noteImageVersion = '';
    this.error.set('');
    this.noteEditor().show();
  }
  editNote(n: { id: number; content: string; imageVersion?: string }) {
    this.noteId = n.id;
    this.note = n.content;
    this.noteFile = null;
    this.noteImageVersion = n.imageVersion ?? '';
    this.error.set('');
    this.noteEditor().show();
  }
  chooseNoteImage(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (file && file.size > 10 * 1024 * 1024) {
      this.error.set('A imagem deve ter até 10 MB.');
      this.noteFile = null;
      return;
    }
    this.noteFile = file;
  }
  noteImageURL(id: number, version: string) {
    return this.endpoint() + '/notes/' + id + '/image?v=' + encodeURIComponent(version);
  }
  readonly expenseEditor = viewChild.required<FlDialog>('expenseEditor');
  readonly autoOpen = input(false);
  readonly closed = output<void>();
  ngAfterViewInit() {
    if (this.autoOpen()) this.startExpense();
  }
  readonly confirmation = inject(Confirmation);
  readonly decimal = formatDecimal;
  readonly money = formatMoneyDecimal;
  readonly endpoint = input.required<string>();
  readonly currency = input('BRL');
  readonly changed = output<void>();
  readonly error = signal('');
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly notes = signal<{ id: number; content: string; author: string; imageVersion?: string }[]>(
    [],
  );
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
    if (!this.autoOpen()) void this.load();
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
  async saveNote() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const response = await fetch(
        this.endpoint() + '/notes' + (this.noteId ? '/' + this.noteId : ''),
        {
          method: this.noteId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: this.note }),
        },
      );
      if (!response.ok) throw Error();
      this.noteId = Number(response.headers.get('X-Note-ID')) || this.noteId;
      if (this.noteFile && this.noteId) {
        const photo = await fetch(this.endpoint() + '/notes/' + this.noteId + '/image', {
          method: 'PUT',
          headers: { 'Content-Type': this.noteFile.type },
          body: this.noteFile,
        });
        if (!photo.ok) {
          this.error.set(
            'A anotação foi salva, mas a imagem falhou. Tente novamente sem criar outra anotação.',
          );
          return;
        }
      }
      await this.load();
      this.changed.emit();
      this.noteEditor().close();
      this.noteFile = null;
    } catch {
      this.error.set('Não foi possível salvar a anotação.');
    } finally {
      this.busy.set(false);
    }
  }
  async deleteNote(id: number) {
    if (await this.confirmation.ask('Excluir esta anotação?'))
      void this.mutate('notes/' + id, 'DELETE', {});
  }
  async saveOwnership() {
    if (
      !(await this.confirmation.ask(
        'Salvar compra/venda? O estado de arquivamento acompanhará a venda informada.',
      ))
    )
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
    this.expenseEditor().show();
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
    this.expenseEditor().show();
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
  async deleteExpense(e: RealEntry) {
    if (await this.confirmation.ask('Excluir esta despesa?'))
      void this.mutate('expense/' + e.id, 'DELETE', {});
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
      this.expenseEditor().close();
    } catch {
      this.error.set('Não foi possível salvar.');
    } finally {
      this.busy.set(false);
    }
  }
}
