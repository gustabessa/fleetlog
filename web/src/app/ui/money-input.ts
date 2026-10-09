import { Directive, ElementRef, forwardRef, inject, input } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  NG_VALIDATORS,
  Validator,
  AbstractControl,
} from '@angular/forms';
@Directive({
  selector: 'input[flMoney]',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FlMoneyInput), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => FlMoneyInput), multi: true },
  ],
  host: {
    '(input)': 'edit()',
    '(focus)': 'focus()',
    '(blur)': 'blur()',
    '[attr.pattern]': 'null',
    inputmode: 'decimal',
  },
})
export class FlMoneyInput implements ControlValueAccessor, Validator {
  readonly currency = input('BRL');
  readonly allowNegative = input(false);
  readonly precision = input<number | null>(null);
  private readonly element = inject(ElementRef<HTMLInputElement>);
  private value = '';
  private focused = false;
  private change: (value: string) => void = () => {};
  private touched: () => void = () => {};
  writeValue(value: string | null) {
    this.value = value ?? '';
    this.render();
  }
  registerOnChange(fn: (v: string) => void) {
    this.change = fn;
  }
  registerOnTouched(fn: () => void) {
    this.touched = fn;
  }
  setDisabledState(disabled: boolean) {
    this.element.nativeElement.disabled = disabled;
  }
  validate(control: AbstractControl) {
    return this.valid(String(control.value ?? '').replace(',', '.')) ? null : { money: true };
  }
  private valid(value: string) {
    return (
      !value ||
      ((!value.startsWith('-') || this.allowNegative()) &&
        /^-?(0|[1-9][0-9]{0,11})(\.[0-9]{1,6})?$/.test(value))
    );
  }
  private validity() {
    this.element.nativeElement.setCustomValidity(
      this.valid(this.value.replace(',', '.'))
        ? ''
        : 'Informe um valor válido, com até seis casas decimais.',
    );
  }
  ngOnChanges() {
    this.render();
  }
  focus() {
    this.focused = true;
  }
  edit() {
    const element = this.element.nativeElement;
    const full = element.value;
    const formatted = /[^0-9, .\-]/.test(full);
    const before = full.slice(0, element.selectionStart ?? full.length);
    const editable = before.replace(/[^0-9,.\-]/g, '');
    const position = (formatted || full.includes(',') ? editable.replace(/\./g, '') : editable)
      .length;
    const text = full.replace(/[^0-9,.-]/g, '');
    let raw = text.includes(',') || formatted ? text.replace(/\./g, '').replace(',', '.') : text;
    if (raw.startsWith('.')) raw = '0' + raw;
    if (raw.startsWith('-.')) raw = '-0' + raw.slice(1);
    const [whole, fraction] = raw.split('.');
    if (/^-?\d+$/.test(whole)) {
      const normalized =
        whole.startsWith('-') && BigInt(whole) === 0n ? '-0' : BigInt(whole).toString();
      raw = normalized + (fraction !== undefined ? '.' + fraction : '');
    }
    this.value = raw;
    this.change(raw);
    this.validity();
    if (/^-?\d*(\.\d{0,6})?$/.test(raw)) {
      const symbol =
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: this.currency() || 'BRL' })
          .formatToParts(0)
          .find((p) => p.type === 'currency')?.value ?? this.currency();
      const [w, f] = raw.split('.');
      const grouped = /^-?\d+$/.test(w)
        ? w === '-0'
          ? '-0'
          : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(BigInt(w))
        : w;
      element.value = symbol + ' ' + grouped + (f !== undefined ? ',' + f : '');
      let found = 0;
      let caret = element.value.length;
      for (let i = 0; i < element.value.length; i++) {
        if (/[0-9,\-]/.test(element.value[i])) found++;
        if (found >= position) {
          caret = i + 1;
          break;
        }
      }
      element.setSelectionRange(caret, caret);
    }
  }
  blur() {
    this.focused = false;
    if (this.value.endsWith('.') || this.value.endsWith(',')) {
      this.value = this.value.slice(0, -1);
      this.change(this.value);
    }
    this.validity();
    this.touched();
    this.render();
  }
  private render() {
    if (this.focused) return;
    if (!this.value) {
      this.element.nativeElement.value = '';
      return;
    }
    const raw = this.value.replace(',', '.');
    if (!/^-?\d+(\.\d{0,6})?$/.test(raw)) {
      this.element.nativeElement.value = this.value;
      return;
    }
    const [whole, fraction = ''] = raw.split('.');
    const code = this.currency() || 'BRL';
    const parts = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: code,
    }).formatToParts(0);
    const digits = this.precision() ?? (code === 'JPY' ? 0 : 2);
    const amount =
      (whole === '-0' ? '-' : '') +
      new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(BigInt(whole));
    const symbol = parts.find((p) => p.type === 'currency')?.value ?? code;
    const places = Math.max(digits, fraction.replace(/0+$/, '').length);
    this.element.nativeElement.value =
      symbol + ' ' + amount + (places ? ',' + fraction.padEnd(places, '0') : '');
  }
}
