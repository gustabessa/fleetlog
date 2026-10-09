import { Component, input, output, signal } from '@angular/core';
import { FlButton } from './button';
@Component({
  selector: 'fl-table-pager',
  imports: [FlButton],
  template: `<div class="pager">
    <span>{{ total() }} registros</span
    ><label
      >Itens por página
      <select
        [attr.aria-label]="label() + ': itens por página'"
        [value]="size()"
        (change)="sizeChange.emit(+$any($event.target).value)"
      >
        @for (n of sizes; track n) {
          <option [value]="n">{{ n }}</option>
        }
      </select></label
    ><span>{{ page() }} / {{ pages() }}</span
    ><button
      flButton
      size="icon"
      [attr.aria-label]="label() + ': página anterior'"
      [disabled]="page() <= 1"
      (click)="pageChange.emit(page() - 1)"
    >
      ‹</button
    ><button
      flButton
      size="icon"
      [attr.aria-label]="label() + ': próxima página'"
      [disabled]="page() >= pages()"
      (click)="pageChange.emit(page() + 1)"
    >
      ›
    </button>
  </div>`,
  styles: `
    .pager {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 12px;
      font: var(--font-caption);
      color: var(--muted);
    }
    .pager > span:first-child {
      margin-right: auto;
    }
    label {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    select {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 4px 6px;
      color: var(--text);
      font: inherit;
    }
  `,
})
export class FlTablePager {
  readonly total = input(0);
  readonly page = input(1);
  readonly size = input(5);
  readonly label = input('Tabela');
  readonly sizeChange = output<number>();
  readonly pageChange = output<number>();
  readonly sizes = [5, 10, 25, 50];
  pages() {
    return Math.max(1, Math.ceil(this.total() / this.size()));
  }
}
export class TablePaging {
  readonly page = signal(1);
  readonly size = signal(5);
  current(total: number) {
    return Math.min(this.page(), Math.max(1, Math.ceil(total / this.size())));
  }
  slice<T>(rows: T[]) {
    const p = this.current(rows.length);
    return rows.slice((p - 1) * this.size(), p * this.size());
  }
  resize(size: number) {
    this.size.set(size);
    this.page.set(1);
  }
}
