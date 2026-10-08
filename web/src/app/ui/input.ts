import { Directive, input } from '@angular/core';

/** Keeps native forms, autocomplete and Angular's value accessor intact. */
@Directive({
  selector: 'input[flInput], textarea[flInput], select[flInput]',
  host: { class: 'fl-input', '[attr.data-size]': 'size()' },
})
export class FlInput {
  readonly size = input<'sm' | 'md' | 'lg'>('md');
}
