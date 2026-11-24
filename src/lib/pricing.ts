import currency from '@data/currency.json';
import type { Locale } from '@/i18n/routing';
import { formatEgp, formatUsd } from './format';

/**
 * Money on the website. Prices are set in one currency, US dollars, as whole dollars a night
 * (fromPriceUsd in data/units.json). The Egyptian pound figure beside a price is always derived
 * from the dollar amount at the rate in data/currency.json, and only ever shown as approximate.
 * Whatever charges a guest later (the payment gateway) should start from the same dollar amount
 * and these helpers, so the price a guest sees and the price they pay come from one place.
 */
export type Currency = 'USD' | 'EGP';
export type Money = { amount: number; currency: Currency };

/** A price as the page shows it: the dollar line, and its pound equivalent set smaller after it. */
export type PriceText = { text: string; equivalent: string | null };

if (!(currency.egpPerUsd > 0)) throw new Error('data/currency.json: egpPerUsd must be a positive number');

export const usd = (amount: number): Money => ({ amount, currency: 'USD' });

/** The amount in pounds at the site's rate, rounded to the nearest EGP 10. */
export function toEgp(money: Money): Money {
  if (money.currency === 'EGP') return money;
  return { amount: Math.round((money.amount * currency.egpPerUsd) / 10) * 10, currency: 'EGP' };
}

export function formatMoney(locale: Locale, { amount, currency: code }: Money) {
  return code === 'EGP' ? formatEgp(locale, amount) : formatUsd(locale, amount);
}
