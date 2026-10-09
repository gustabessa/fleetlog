const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal = new Intl.NumberFormat('pt-BR');
/** Monetary values are stored and passed in cents. */
export const formatMoney = (cents: number) => currency.format(cents / 100);
export const formatNumber = (value: number) => decimal.format(value);

/** Format persisted decimal values without converting financial amounts to floats. */
export function formatMoneyDecimal(value: string, code: string): string {
  const [whole, fraction = ''] = value.split('.');
  if (!/^\d+$/.test(whole)) return '—';
  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: code });
  const scale = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  const parts = formatter.formatToParts(0);
  const first = parts.findIndex((p) => p.type === 'integer');
  const last =
    parts.length -
    1 -
    [...parts].reverse().findIndex((p) => p.type === 'integer' || p.type === 'fraction');
  const prefix = parts
    .slice(0, first)
    .map((p) => p.value)
    .join('');
  const suffix = parts
    .slice(last + 1)
    .map((p) => p.value)
    .join('');
  const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(
    BigInt(whole),
  );
  return (
    prefix + integer + (scale ? ',' + fraction.padEnd(scale, '0').slice(0, scale) : '') + suffix
  );
}
