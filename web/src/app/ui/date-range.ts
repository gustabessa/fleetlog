import {
  Component,
  computed,
  input,
  output,
  signal,
  ElementRef,
  inject,
  DestroyRef,
  afterEveryRender,
} from '@angular/core';
import { FlButton } from './button';
@Component({
  selector: 'fl-date-range',
  imports: [FlButton],
  host: { '(keydown.escape)': 'close()' },
  template: `<span class="label" [id]="id() + '-label'">{{ label() }}</span>
    <button
      flButton
      class="trigger"
      [attr.aria-labelledby]="id() + '-label ' + id() + '-value'"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="id() + '-calendar'"
      (click)="toggle()"
    >
      <span [id]="id() + '-value'">{{ summary() }}</span
      ><span aria-hidden="true">▦</span>
    </button>
    @if (open()) {
      <div
        class="calendar"
        [id]="id() + '-calendar'"
        role="region"
        [attr.aria-label]="label() + ': calendário'"
      >
        <div class="month">
          <button flButton size="icon" aria-label="Mês anterior" (click)="move(-1)">‹</button
          ><strong aria-live="polite">{{ monthLabel() }}</strong
          ><button flButton size="icon" aria-label="Próximo mês" (click)="move(1)">›</button>
        </div>
        <p role="status">
          {{ pickingEnd() ? 'Selecione a data final' : 'Selecione a data inicial' }}
        </p>
        <div class="grid">
          @for (day of weekdays; track $index) {
            <span class="weekday" aria-hidden="true">{{ day }}</span>
          }
          @for (day of days(); track $index) {
            @if (day) {
              <button
                type="button"
                class="day"
                [class.edge]="day.iso === from() || day.iso === to()"
                [class.in-range]="!!from() && !!to() && day.iso > from() && day.iso < to()"
                [attr.aria-label]="day.label"
                [attr.aria-pressed]="day.iso === from() || day.iso === to()"
                (click)="pick(day.iso)"
              >
                {{ day.number }}
              </button>
            } @else {
              <span></span>
            }
          }
        </div>
        <div class="actions">
          <button flButton variant="ghost" size="sm" (click)="clear()">Limpar período</button
          ><button flButton variant="ghost" size="sm" (click)="close()">Fechar</button>
        </div>
      </div>
    }`,
  styles: `
    :host {
      display: block;
      position: relative;
      min-width: 0;
    }
    .label {
      display: block;
      font: var(--font-label);
      margin-bottom: var(--space-2);
    }
    .trigger {
      background: var(--bg);
      width: 100%;
      justify-content: space-between;
      text-align: left;
      font-weight: 400;
    }
    .calendar {
      position: absolute;
      top: 100%;
      left: 0;
      z-index: 10;
      width: 320px;
      max-width: calc(100vw - 64px);
      padding: var(--space-4);
      margin-top: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      border: 1px solid var(--line);
      border-radius: var(--radius-card);
      background: var(--surface);
      box-shadow: 0 12px 36px #0003;
    }
    .month,
    .actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
    }
    .month strong {
      font: var(--font-label);
    }
    p {
      font: var(--font-caption);
      margin: var(--space-3) 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
    }
    .weekday {
      text-align: center;
      font: var(--font-caption);
      padding: var(--space-2) 0;
      color: var(--muted);
    }
    .day {
      height: 36px;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--text);
      border-radius: 6px;
      font: var(--font-label);
      cursor: pointer;
    }
    .day:hover,
    .day.in-range {
      background: var(--soft);
    }
    .day.edge {
      background: var(--accent);
      color: var(--on-accent);
    }
    .actions {
      margin-top: var(--space-3);
    }
  `,
})
export class FlDateRange {
  readonly id = input.required<string>();
  readonly label = input('Período');
  readonly from = input('');
  readonly to = input('');
  readonly rangeChange = output<{ from: string; to: string }>();
  readonly open = signal(false);
  readonly pickingEnd = signal(false);
  readonly month = signal(this.currentMonth());
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  constructor() {
    const dismiss = (event: PointerEvent) => this.outside(event);
    document.addEventListener('pointerdown', dismiss, true);
    const reposition = () => this.positionCalendar();
    afterEveryRender(reposition);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    window.visualViewport?.addEventListener('resize', reposition);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('pointerdown', dismiss, true);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      window.visualViewport?.removeEventListener('resize', reposition);
    });
  }
  readonly weekdays = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
      new Date(this.month() + '-01T12:00:00'),
    ),
  );
  readonly summary = computed(() =>
    this.from()
      ? `${this.format(this.from())} — ${this.to() ? this.format(this.to()) : 'Data final'}`
      : 'Selecionar período',
  );
  readonly days = computed(() => {
    const [year, month] = this.month().split('-').map(Number);
    const offset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const count = new Date(year, month, 0).getDate();
    return Array.from({ length: offset + count }, (_, index) => {
      const number = index - offset + 1;
      if (number < 1) return null;
      const iso = `${this.month()}-${String(number).padStart(2, '0')}`;
      return {
        number,
        iso,
        label: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(
          new Date(iso + 'T12:00:00'),
        ),
      };
    });
  });
  private positionCalendar() {
    if (!this.open()) return;
    const host = this.element.nativeElement;
    const calendar = host.querySelector<HTMLElement>('.calendar');
    const trigger = host.querySelector<HTMLElement>('.trigger');
    if (!calendar || !trigger) return;
    const anchor = trigger.getBoundingClientRect();
    const origin = host.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
    const gap = 8;
    const below = Math.max(0, viewportBottom - anchor.bottom - gap - 8);
    const above = Math.max(0, anchor.top - viewportTop - gap - 8);
    calendar.style.maxHeight = 'none';
    const naturalHeight = calendar.getBoundingClientRect().height;
    const upwards = naturalHeight > below && (naturalHeight <= above || above > below);
    const height = Math.min(naturalHeight, upwards ? above : below);
    calendar.style.maxHeight = `${height}px`;
    calendar.style.top = `${upwards ? anchor.top - origin.top - gap - height : anchor.bottom - origin.top + gap}px`;
    const width = calendar.getBoundingClientRect().width;
    calendar.style.left = `${Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8)) - origin.left}px`;
    calendar.dataset['placement'] = upwards ? 'top' : 'bottom';
  }
  private currentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  format(iso: string) {
    return iso.split('-').reverse().join('/');
  }
  toggle() {
    if (!this.open()) {
      this.month.set(this.from().slice(0, 7) || this.currentMonth());
      this.pickingEnd.set(false);
    }
    this.open.update((value) => !value);
  }
  move(delta: number) {
    const [year, month] = this.month().split('-').map(Number);
    const next = new Date(year, month - 1 + delta, 1);
    this.month.set(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  }
  pick(iso: string) {
    if (!this.pickingEnd()) {
      this.rangeChange.emit({ from: iso, to: '' });
      this.pickingEnd.set(true);
    } else {
      this.rangeChange.emit({
        from: iso < this.from() ? iso : this.from(),
        to: iso < this.from() ? this.from() : iso,
      });
      this.close();
    }
  }
  clear() {
    this.rangeChange.emit({ from: '', to: '' });
    this.pickingEnd.set(false);
  }
  close() {
    this.open.set(false);
    this.element.nativeElement.querySelector<HTMLButtonElement>('.trigger')?.focus();
  }
  outside(event: Event) {
    if (this.open() && !this.element.nativeElement.contains(event.target as Node))
      this.open.set(false);
  }
}
