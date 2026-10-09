import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlButton, FlCard, FlField, FlInput } from '../ui';
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
interface Reading {
  id: number;
  date: string;
  km: string;
  origin: string;
  author: string;
}
@Component({
  selector: 'fl-readings',
  imports: [FormsModule, FlButton, FlCard, FlField, FlInput],
  template: `<section flCard>
    <h3>Odômetro</h3>
    @if (error()) {
      <p role="alert">{{ error() }}</p>
      <button flButton (click)="load()">Recarregar leituras</button>
    }
    @if (loading()) {
      <p role="status">Carregando leituras…</p>
    }
    <form ngNativeValidate (ngSubmit)="save()">
      <fieldset [disabled]="busy()">
        <fl-field controlId="reading-date" label="Data da leitura"
          ><input flInput id="reading-date" name="date" type="date" [(ngModel)]="date" required
        /></fl-field>
        <fl-field controlId="reading-km" label="Quilometragem (km)"
          ><input
            flInput
            id="reading-km"
            name="km"
            inputmode="decimal"
            [(ngModel)]="km"
            required
            pattern="[0-9]+([.,][0-9]{1,3})?"
        /></fl-field>
        <button flButton type="submit" [loading]="busy()">
          {{ editing ? 'Salvar leitura' : 'Adicionar leitura' }}
        </button>
        @if (editing) {
          <button flButton type="button" (click)="reset()">Cancelar edição</button>
        }
      </fieldset>
    </form>
    @for (reading of readings(); track reading.id) {
      <p>
        {{ reading.date }} · {{ reading.km }} km · {{ origin(reading.origin) }} ·
        {{ reading.author }}
      </p>
      @if (reading.origin === 'manual') {
        <button flButton (click)="edit(reading)" [disabled]="busy()">Editar leitura</button
        ><button flButton (click)="remove(reading)" [disabled]="busy()">Excluir leitura</button>
      }
    }
    @if (!loading() && !readings().length) {
      <p>Nenhuma leitura adicional. A quilometragem inicial está preservada.</p>
    }
    <button flButton (click)="loadAudit()">Ver auditoria de leituras</button>
    @if (audit(); as events) {
      @for (event of events; track event.id) {
        <p>
          {{ event.changedAt }} · {{ event.author }} · {{ event.action }} ·
          {{ event.before?.km ?? '—' }} → {{ event.after?.km ?? '—' }} km
        </p>
      }
    }
  </section>`,
  styles: `
    fieldset {
      border: 0;
      padding: 0;
      display: grid;
      gap: var(--space-3);
    }
    section {
      margin-top: var(--space-5);
    }
    button {
      margin: var(--space-2);
    }
  `,
})
export class Readings {
  readonly endpoint = input.required<string>();
  readonly changed = output<void>();
  readonly readings = signal<Reading[]>([]);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly audit = signal<
    | {
        id: number;
        changedAt: string;
        author: string;
        action: string;
        before: { km: string } | null;
        after: { km: string } | null;
      }[]
    | null
  >(null);
  date = today();
  km = '';
  editing: number | null = null;
  ngOnInit() {
    void this.load();
  }
  origin(value: string) {
    return (
      (
        { manual: 'Leitura avulsa', fuel: 'Abastecimento', service: 'Manutenção' } as Record<
          string,
          string
        >
      )[value] ?? value
    );
  }
  reset() {
    this.date = today();
    this.km = '';
    this.editing = null;
  }
  edit(reading: Reading) {
    this.date = reading.date;
    this.km = reading.km;
    this.editing = reading.id;
  }
  async load() {
    this.loading.set(true);
    try {
      const r = await fetch(this.endpoint(), { cache: 'no-store' });
      if (!r.ok) throw Error();
      this.readings.set(await r.json());
      this.error.set('');
    } catch {
      this.error.set('Não foi possível carregar as leituras.');
    } finally {
      this.loading.set(false);
    }
  }
  async loadAudit() {
    try {
      const r = await fetch(this.endpoint() + '/audit', { cache: 'no-store' });
      if (!r.ok) throw Error();
      this.audit.set(await r.json());
    } catch {
      this.error.set('Não foi possível carregar a auditoria.');
    }
  }
  save() {
    return this.mutate(this.editing ? 'PUT' : 'POST', this.editing, {
      date: this.date,
      km: this.km.replace(',', '.'),
    });
  }
  remove(reading: Reading) {
    if (confirm('Excluir esta leitura? O km atual será recalculado e a auditoria será preservada.'))
      void this.mutate('DELETE', reading.id, {});
  }
  private async mutate(method: string, id: number | null, body: object) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const r = await fetch(this.endpoint() + (id ? '/' + id : ''), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        this.error.set(
          r.status === 409
            ? 'A leitura é incoerente com o km inicial ou com leituras anteriores/posteriores.'
            : 'Não foi possível salvar a leitura. Confira os campos e tente novamente.',
        );
        return;
      }
      this.readings.set(await r.json());
      this.audit.set(null);
      this.reset();
      this.changed.emit();
    } catch {
      this.error.set('Não foi possível salvar a leitura.');
    } finally {
      this.busy.set(false);
    }
  }
}
