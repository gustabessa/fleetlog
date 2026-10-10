import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'localDate' })
export class LocalDate implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '—';
    const civil = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const date = civil
      ? new Date(Number(civil[1]), Number(civil[2]) - 1, Number(civil[3]))
      : new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat(document.documentElement.lang || navigator.language || 'pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(date);
  }
}
