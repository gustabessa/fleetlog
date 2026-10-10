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
    queueMicrotask(() => {
      const el = this.element.nativeElement;
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }
  edit() {
    const element = this.element.nativeElement;
    const full = element.value;
    const negative = full.includes('-');
    const digits = full.replace(/[^0-9]/g, '');
    if (!digits) {
      this.value = '';
      this.change('');
      this.validity();
      element.value = '';
      return;
    }
    // Digit entry behaves like a card terminal: 1 -> 0,01; 1234 -> 12,34.
    const scale = Math.max(2, this.precision() ?? 2);
    const minor = digits.replace(/^0+(?=\d)/, '').padStart(scale + 1, '0');
    const whole = minor.slice(0, -scale);
    const fraction = minor.slice(-scale);
    this.value = (negative ? '-' : '') + whole + '.' + fraction;
    this.change(this.value);
    this.validity();
    this.format();
    element.setSelectionRange(element.value.length, element.value.length);
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
    this.format();
  }
  private format() {
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
    const digits = Math.max(2, this.precision() ?? 2);
    const amount =
      (whole === '-0' ? '-' : '') +
      new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(BigInt(whole));
    const symbol = parts.find((p) => p.type === 'currency')?.value ?? code;
    const places = Math.max(digits, fraction.replace(/0+$/, '').length);
    this.element.nativeElement.value =
      symbol + ' ' + amount + (places ? ',' + fraction.padEnd(places, '0') : '');
  }
}
