import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlButton, FlCard, FlField, FlInput } from '../ui';
import { today } from './readings';
import { RealEntry } from './fuel';
const empty = (currency: string) => ({ date: today(), title: '', km: '', amount: '', currency });
@Component({
  selector: 'fl-maintenance',
  imports: [FormsModule, FlButton, FlCard, FlField, FlInput],
  template: `<section flCard>
    <h3>Manutenções</h3>
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
      title: e.title,
      amount: e.amount,
      currency: e.currency,
      km: e.km ?? '',
    };
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
