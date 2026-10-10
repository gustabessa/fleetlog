import { Component, input } from '@angular/core';
@Component({
  selector: 'fl-icon',
  template: `<svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path [attr.d]="paths[name()]" />
  </svg>`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
    }
  `,
})
export class FlIcon {
  readonly name = input<
    | 'edit'
    | 'delete'
    | 'calendar'
    | 'fuel'
    | 'service'
    | 'expense'
    | 'archive'
    | 'restore'
    | 'fingerprint'
  >('edit');
  readonly paths = {
    fingerprint:
      'M12 11a2 2 0 0 0-2 2c0 3-.5 5-1.5 7M14 13c0 4-.5 7-1.5 9M8 16v-3a4 4 0 0 1 8 0c0 3-.2 5-.7 7M5 17v-4a7 7 0 0 1 14 0v3M3 10a9 9 0 0 1 18 0M7 4a9 9 0 0 1 10 0',
    archive: 'M3 4h18v4H3V4ZM5 8v13h14V8M10 12h4',
    restore: 'M4 12a8 8 0 1 0 2-6M2 4v6h6',
    edit: 'M16 3l5 5M3 21l4-1 14-14a2 2 0 0 0-5-3L2 17l1 4Z',
    delete: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
    calendar: 'M4 5h16v16H4V5ZM8 3v4M16 3v4M4 10h16M8 14h2M14 14h2M8 18h2',
    fuel: 'M3 21V4h10v17M3 9h10M1 21h14M13 12h3v5a2 2 0 0 0 4 0V9l-3-3M18 7v4h2',
    service: 'M14 7a5 5 0 0 0-6 6L2 19l3 3 6-6a5 5 0 0 0 6-6l-3 3-3-3 3-3Z',
    expense: 'M5 3h14v18l-3-2-4 2-4-2-3 2V3ZM8 8h8M8 12h8',
  };
}
