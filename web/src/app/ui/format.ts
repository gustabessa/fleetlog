const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal = new Intl.NumberFormat('pt-BR');
/** Monetary values are stored and passed in cents. */
export const formatMoney = (cents: number) => currency.format(cents / 100);
export const formatNumber = (value: number) => decimal.format(value);
