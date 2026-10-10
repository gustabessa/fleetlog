import { Component, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlButton, FlCard, FlField, FlInput, FlLoading, FlDialog } from '../ui';
import { FlIcon } from '../ui/icon';
import { FlTablePager, TablePaging } from '../ui/table-pager';
import { Confirmation } from '../ui/confirmation';
import { inject } from '@angular/core';
import { Maintenance } from './maintenance';
import { today } from './readings';
import { formatNumber } from '../ui/format';
interface Rule {
  id: number;
  vehicleId: number;
  vehicleName: string;
  title: string;
  intervalKm: string | null;
  intervalMonths: number | null;
  baseKm: string | null;
  baseDate: string | null;
  advanceKm: string;
  advanceDays: number;
  nextKm: string | null;
  nextDate: string | null;
  remainingKm: string | null;
  remainingDays: number | null;
  lastEntryId: number | null;
  status: string;
}
const empty = () => ({
  title: '',
  intervalKm: '',
  intervalMonths: '',
  baseKm: '',
  baseDate: '',
  advanceKm: '0',
  advanceDays: 0,
});
@Component({
  selector: 'fl-reminders',
  imports: [
    FormsModule,
    FlButton,
    FlCard,
    FlField,
    FlInput,
    FlLoading,
    FlDialog,
    FlIcon,
    FlTablePager,
    Maintenance,
  ],
  template: `
    <section flCard>
      <div class="section-heading">
        <h3>Lembretes de manutenção</h3>
        @if (vehicleId()) {
          <button flButton (click)="edit()">Adicionar lembrete</button>
        }
      </div>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
        <button flButton (click)="load()">Tentar novamente</button>
      }
      @if (loading()) {
        <fl-loading>Carregando lembretes…</fl-loading>
      }
      @if (!vehicleId()) {
        @for (rule of alerts(); track rule.id) {
          <div class="notice" [attr.data-status]="rule.status">
            <div>
              <strong>{{ rule.title }}</strong>
              <p>{{ rule.vehicleName }} · {{ status(rule.status) }} · {{ remaining(rule) }}</p>
            </div>
            <button flButton (click)="navigate.emit(rule.vehicleId)">Ver veículo</button>
          </div>
        }
        @if (!loading() && !alerts().length) {
          <p class="fl-caption">
            {{
              rules().length
                ? 'Nenhuma manutenção próxima ou vencida.'
                : 'Configure os intervalos de manutenção nos detalhes de cada veículo.'
            }}
          </p>
        }
      } @else {
        @if (rules().length) {
          <div class="record-table">
            <table>
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Próxima manutenção</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (rule of pager.slice(rules()); track rule.id) {
                  <tr>
                    <td>
                      <strong>{{ rule.title }}</strong
                      ><small>{{ interval(rule) }}</small>
                    </td>
                    <td>
                      {{ rule.nextKm ? number(rule.nextKm) + ' km' : ''
                      }}<small>{{ rule.nextDate || '' }}</small>
                    </td>
                    <td>
                      <span [attr.data-status]="rule.status">{{ status(rule.status) }}</span
                      ><small>{{ remaining(rule) }}</small>
                    </td>
                    <td>
                      <div class="actions">
                        <button flButton (click)="active.set(rule)">Registrar manutenção</button
                        ><button flButton (click)="link(rule)">Vincular existente</button
                        ><button
                          flButton
                          size="icon"
                          aria-label="Editar lembrete"
                          title="Editar lembrete"
                          (click)="edit(rule)"
                        >
                          <fl-icon name="edit" /></button
                        ><button
                          flButton
                          size="icon"
                          aria-label="Excluir lembrete"
                          title="Excluir lembrete"
                          (click)="remove(rule)"
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
          <fl-table-pager
            label="Lembretes"
            [total]="rules().length"
            [page]="pager.current(rules().length)"
            [size]="pager.size()"
            (pageChange)="pager.page.set($event)"
            (sizeChange)="pager.resize($event)"
          />
        }
        @if (!loading() && !rules().length) {
          <p>Nenhum lembrete configurado. Use os intervalos recomendados no manual do veículo.</p>
        }
      }
    </section>
    @if (vehicleId()) {
      <fl-dialog
        #editor
        [title]="editing === null ? 'Adicionar lembrete' : 'Editar lembrete'"
        [dismissible]="!busy()"
      >
        <form id="reminder-form" ngNativeValidate (ngSubmit)="save()">
          <fieldset [disabled]="busy()">
            <fl-field controlId="reminder-title" label="Serviço"
              ><input
                flInput
                id="reminder-title"
                name="title"
                [(ngModel)]="form.title"
                maxlength="120"
                placeholder="Ex.: óleo e filtro"
                required
            /></fl-field>
            <p class="fl-caption">
              Configure km, meses ou ambos. Vence pelo primeiro limite atingido.
            </p>
            <div class="form-grid">
              <fl-field controlId="reminder-km" label="Intervalo (km)"
                ><input
                  flInput
                  id="reminder-km"
                  name="intervalKm"
                  [(ngModel)]="form.intervalKm"
                  inputmode="decimal"
              /></fl-field>
              <fl-field controlId="reminder-months" label="Intervalo (meses)"
                ><input
                  flInput
                  id="reminder-months"
                  name="months"
                  type="number"
                  min="1"
                  max="1200"
                  [(ngModel)]="form.intervalMonths"
              /></fl-field>
              <fl-field controlId="reminder-base-km" label="Km da última realização"
                ><input
                  flInput
                  id="reminder-base-km"
                  name="baseKm"
                  [(ngModel)]="form.baseKm"
                  inputmode="decimal"
                  [required]="!!form.intervalKm"
              /></fl-field>
              <fl-field controlId="reminder-base-date" label="Data da última realização"
                ><input
                  flInput
                  id="reminder-base-date"
                  name="baseDate"
                  type="date"
                  [(ngModel)]="form.baseDate"
                  [required]="!!form.intervalMonths"
              /></fl-field>
              <fl-field controlId="reminder-advance-km" label="Avisar antes (km)"
                ><input
                  flInput
                  id="reminder-advance-km"
                  name="advanceKm"
                  [(ngModel)]="form.advanceKm"
                  inputmode="decimal"
              /></fl-field>
              <fl-field controlId="reminder-advance-days" label="Avisar antes (dias)"
                ><input
                  flInput
                  id="reminder-advance-days"
                  name="advanceDays"
                  type="number"
                  min="0"
                  max="3650"
                  [(ngModel)]="form.advanceDays"
              /></fl-field>
            </div>
            <p class="fl-caption">
              Uma manutenção vinculada passa a ser a referência das metas. Sem vínculo, usamos a
              última realização informada acima.
            </p>
            @if (formError()) {
              <p role="alert" class="error">{{ formError() }}</p>
            }
          </fieldset>
        </form>
        <div flDialogFooter class="actions">
          <button flButton [disabled]="busy()" (click)="editor.close()">Cancelar</button
          ><button flButton variant="primary" type="submit" form="reminder-form" [loading]="busy()">
            Salvar lembrete
          </button>
        </div>
      </fl-dialog>
      <fl-dialog #linker title="Vincular manutenção existente" [dismissible]="!busy()">
        <p>Selecione a manutenção que realizou {{ linking()?.title }}.</p>
        <fl-field controlId="reminder-entry" label="Manutenção registrada"
          ><select flInput id="reminder-entry" [(ngModel)]="entryId">
            <option [ngValue]="0">Selecione</option>
            @for (e of entries(); track e.id) {
              <option [ngValue]="e.id">
                {{ e.date }} · {{ e.title || 'Manutenção' }} ·
                {{ e.km === null ? 'sem odômetro' : e.km + ' km' }}
              </option>
            }
          </select></fl-field
        >
        @if (formError()) {
          <p role="alert" class="error">{{ formError() }}</p>
        }
        @if (!entries().length) {
          <p>Nenhuma manutenção disponível. Registre uma manutenção pelo atalho do lembrete.</p>
        }
        <div flDialogFooter class="actions">
          <button flButton [disabled]="busy()" (click)="linker.close()">Cancelar</button
          ><button
            flButton
            variant="primary"
            [disabled]="!entryId"
            [loading]="busy()"
            (click)="complete()"
          >
            Vincular manutenção
          </button>
        </div>
      </fl-dialog>
    }
    @if (active(); as rule) {
      <fl-maintenance
        [autoOpen]="true"
        [endpoint]="vehicleEndpoint(rule.vehicleId)"
        [currency]="currency()"
        [reminderId]="rule.id"
        [suggestedTitle]="rule.title"
        [requireKM]="!!rule.intervalKm"
        (changed)="finished()"
        (closed)="active.set(null)"
      />
    }
  `,
  styles: `
    :host {
      display: block;
      margin-block: 16px;
    }
    .section-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    h3 {
      margin: 0;
    }
    .notice {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid var(--line);
    }
    .notice p {
      margin: 4px 0;
      font: var(--font-caption);
    }
    [data-status='overdue'] {
      color: var(--danger);
    }
    [data-status='upcoming'],
    [data-status='needs-data'] {
      color: var(--accent);
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    fieldset {
      border: 0;
      padding: 0;
      margin: 0;
    }
    @media (max-width: 600px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
      .actions button {
        min-height: 44px;
      }
      .notice {
        align-items: flex-start;
      }
    }
  `,
})
export class Reminders {
  readonly garageId = input.required<number>();
  readonly vehicleId = input<number | null>(null);
  readonly currency = input('BRL');
  readonly revision = input(0);
  readonly navigate = output<number>();
  readonly changed = output<void>();
  readonly rules = signal<Rule[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly busy = signal(false);
  readonly active = signal<Rule | null>(null);
  readonly linking = signal<Rule | null>(null);
  readonly entries = signal<any[]>([]);
  readonly editor = viewChild<FlDialog>('editor');
  readonly linker = viewChild<FlDialog>('linker');
  readonly pager = new TablePaging();
  readonly confirmation = inject(Confirmation);
  readonly number = (value: string) => formatNumber(Number(value));
  form = empty();
  editing: number | null = null;
  entryId = 0;
  private request: AbortController | null = null;
  vehicleEndpoint(id: number) {
    return '/api/garages/' + this.garageId() + '/vehicles/' + id;
  }
  get endpoint() {
    return this.vehicleId()
      ? this.vehicleEndpoint(this.vehicleId()!) + '/reminders'
      : '/api/garages/' + this.garageId() + '/reminders';
  }
  ngOnChanges() {
    void this.load();
  }
  ngOnDestroy() {
    this.request?.abort();
  }
  alerts() {
    return this.rules().filter((r) => r.status !== 'ok');
  }
  status(s: string) {
    return (
      {
        ok: 'Em dia',
        upcoming: 'Próxima',
        overdue: 'Vencida',
        'needs-data': 'Dados incompletos',
      } as any
    )[s];
  }
  interval(r: Rule) {
    return [
      r.intervalKm ? 'A cada ' + this.number(r.intervalKm) + ' km' : '',
      r.intervalMonths ? r.intervalMonths + ' meses' : '',
    ]
      .filter(Boolean)
      .join(' ou ');
  }
  remaining(r: Rule) {
    if (r.status === 'needs-data') return 'Confira data/odômetro da manutenção vinculada';
    return [
      r.remainingKm !== null
        ? (Number(r.remainingKm) < 0 ? 'Passou ' : 'Faltam ') +
          this.number(String(Math.abs(Number(r.remainingKm)))) +
          ' km'
        : '',
      r.remainingDays !== null
        ? (r.remainingDays < 0 ? 'Passou ' : 'Faltam ') + Math.abs(r.remainingDays) + ' dias'
        : '',
    ]
      .filter(Boolean)
      .join(' · ');
  }
  async load() {
    this.request?.abort();
    const c = new AbortController();
    this.request = c;
    this.loading.set(true);
    this.error.set('');
    try {
      const r = await fetch(this.endpoint + '?asOf=' + today(), {
        cache: 'no-store',
        signal: c.signal,
      });
      if (!r.ok) throw Error();
      this.rules.set(await r.json());
    } catch {
      if (!c.signal.aborted) this.error.set('Não foi possível carregar os lembretes.');
    } finally {
      if (!c.signal.aborted) this.loading.set(false);
    }
  }
  edit(r?: Rule) {
    this.editing = r?.id ?? null;
    this.form = r
      ? {
          title: r.title,
          intervalKm: r.intervalKm ?? '',
          intervalMonths: r.intervalMonths === null ? '' : String(r.intervalMonths),
          baseKm: r.baseKm ?? '',
          baseDate: r.baseDate ?? '',
          advanceKm: r.advanceKm,
          advanceDays: r.advanceDays,
        }
      : empty();
    this.formError.set('');
    this.editor()?.show();
  }
  async save() {
    const f = this.form;
    if (!f.intervalKm && !f.intervalMonths) {
      this.formError.set('Informe intervalo em km, meses ou ambos.');
      return;
    }
    const body = {
      ...f,
      intervalKm: f.intervalKm ? f.intervalKm.replace(',', '.') : null,
      intervalMonths: f.intervalMonths ? Number(f.intervalMonths) : null,
      baseKm: f.baseKm ? f.baseKm.replace(',', '.') : null,
      baseDate: f.baseDate || null,
      advanceKm: f.advanceKm.replace(',', '.') || '0',
      advanceDays: Number(f.advanceDays),
    };
    if (
      await this.mutate(
        this.editing ? 'PUT' : 'POST',
        this.endpoint + (this.editing ? '/' + this.editing : ''),
        body,
      )
    )
      this.editor()?.close(true);
  }
  async mutate(method: string, url: string, body?: object) {
    if (this.busy()) return false;
    this.busy.set(true);
    this.formError.set('');
    try {
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!r.ok) throw Error();
      await this.load();
      this.changed.emit();
      return true;
    } catch {
      this.formError.set(
        'Não foi possível salvar. Confira intervalos, data e odômetro necessários.',
      );
      return false;
    } finally {
      this.busy.set(false);
    }
  }
  async remove(r: Rule) {
    if (
      await this.confirmation.ask(
        'Excluir este lembrete? As manutenções registradas serão preservadas.',
      )
    ) {
      if (!(await this.mutate('DELETE', this.endpoint + '/' + r.id)))
        this.error.set(this.formError());
    }
  }
  async link(r: Rule) {
    this.linking.set(r);
    this.entryId = 0;
    this.entries.set([]);
    this.formError.set('');
    this.linker()?.show();
    try {
      const resp = await fetch(this.vehicleEndpoint(r.vehicleId) + '/service', {
        cache: 'no-store',
      });
      if (!resp.ok) throw Error();
      this.entries.set(await resp.json());
    } catch {
      this.formError.set('Não foi possível carregar as manutenções.');
    }
  }
  async complete() {
    const r = this.linking();
    if (
      r &&
      this.entryId &&
      (await this.mutate('POST', this.endpoint + '/' + r.id + '/complete', {
        entryId: this.entryId,
      }))
    )
      this.linker()?.close(true);
  }
  finished() {
    this.active.set(null);
    void this.load();
    this.changed.emit();
  }
}
