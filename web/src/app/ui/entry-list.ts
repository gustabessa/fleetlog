import { LocalDate } from './local-date';
import { formatMoney, formatMoneyDecimal } from './format';
import { Component, input } from '@angular/core';
import { FlBadge } from './badge';
export interface LogEntry {
  id?: number;
  amount?: string;
  currency?: string;
  vehicle: number;
  title: string;
  detail: string;
  date: string;
  isoDate: string;
  km: string;
  cents: number;
  kind: string;
}
@Component({
  selector: 'fl-entry-list',
  imports: [LocalDate, FlBadge],
  template: `@for (entry of entries(); track entry.id ?? $index) {
      <article class="entry">
        <span class="icon" aria-hidden="true">{{
          entry.kind === 'fuel' ? '↗' : entry.kind === 'service' ? '⚙' : '▤'
        }}</span>
        <div>
          <fl-badge [color]="vehicles()[entry.vehicle].tagColor"
            >{{ vehicles()[entry.vehicle].name }} · {{ vehicles()[entry.vehicle].plate }}</fl-badge
          >
          <p class="date">{{ entry.isoDate | localDate }} · {{ entry.km }}</p>
          <h3>{{ entry.title }}</h3>
          <p>{{ entry.detail }}</p>
        </div>
        <strong>{{
          entry.amount !== undefined
            ? decimalMoney(entry.amount, entry.currency ?? 'BRL')
            : money(entry.cents)
        }}</strong>
      </article>
    } @empty {
      <p class="empty" role="status">Nenhum lançamento encontrado para estes filtros.</p>
    }`,
  styles: `
    :host {
      display: block;
    }
    .entry {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-6) 0;
      border-bottom: 1px solid var(--line);
    }
    .entry:first-child {
      padding-top: 0;
    }
    .entry:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }
    .icon {
      width: var(--control-md);
      height: var(--control-md);
      flex-shrink: 0;
      display: grid;
      place-items: center;
      background: var(--soft);
      color: var(--accent);
      border-radius: var(--radius-control);
      font-size: var(--text-title);
    }
    h3 {
      font-size: var(--text-body);
      margin: var(--space-1) 0;
    }
    p {
      font: var(--font-caption);
      margin: 0;
    }
    .date {
      margin-top: var(--space-2);
    }
    strong {
      margin-left: auto;
      white-space: nowrap;
      font: var(--font-label);
    }
    .empty {
      padding: var(--space-4);
      text-align: center;
    }
    @media (max-width: 700px) {
      .entry {
        flex-wrap: wrap;
      }
      .entry > div {
        flex: 1;
        min-width: 0;
      }
      strong {
        width: 100%;
        margin-left: var(--space-14);
      }
    }
  `,
})
export class FlEntryList {
  readonly entries = input.required<LogEntry[]>();
  readonly vehicles = input.required<{ name: string; plate: string; tagColor: string }[]>();
  readonly decimalMoney = formatMoneyDecimal;
  readonly money = formatMoney;
}
