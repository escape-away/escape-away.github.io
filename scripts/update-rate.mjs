#!/usr/bin/env node
/**
 * Refreshes the dollar-to-pound rate in data/currency.json, which sets the pound figures shown beside
 * the dollar prices. The deploy runs it before every build, including the one scheduled each morning,
 * so those figures follow the day's rate. Run it by hand with `npm run rate`.
 *
 * The source is the free exchange-api by Fawaz Ahmed (public domain, no key, no credit needed on the
 * site), read from both of its mirrors; the answer with the newer date wins. A rate outside 10 to 500
 * pounds to the dollar is treated as a broken answer. If no mirror gives a usable rate, the file is
 * left as it is, the build goes on with the last rate, and the run shows a warning. Never fails the build.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../data/currency.json', import.meta.url);
const SOURCES = [
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
  'https://latest.currency-api.pages.dev/v1/currencies/usd.json',
];
const BELIEVABLE = { min: 10, max: 500 };

const say = (msg) => console.log(`update-rate: ${msg}`);
const warn = (msg) => console.log(process.env.GITHUB_ACTIONS ? `::warning title=Exchange rate::${msg}` : `update-rate: ${msg}`);

async function fetchRate(url) {
  const host = new URL(url).host;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    const rate = body?.usd?.egp;
    if (typeof rate !== 'number' || !(rate > BELIEVABLE.min && rate < BELIEVABLE.max)) throw new Error(`unusable rate ${rate}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date ?? '')) throw new Error('no date in the answer');
    return { rate, date: body.date, host };
  } catch (error) {
    warn(`${host} gave no usable rate (${error.message})`);
    return null;
  }
}

const raw = readFileSync(FILE, 'utf8');
const current = JSON.parse(raw);
const [best] = (await Promise.all(SOURCES.map(fetchRate))).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));

if (!best) {
  warn(`no source answered; the pound figures keep EGP ${current.egpPerUsd} per US$ from ${current.asOf}`);
} else if (best.date < current.asOf) {
  say(`kept EGP ${current.egpPerUsd} (${current.asOf}): newer than the sources' ${best.date}`);
} else {
  const next = {
    ...current,
    egpPerUsd: Math.round(best.rate * 100) / 100,
    asOf: best.date,
    source: `exchange-api by Fawaz Ahmed (${best.host}), ${best.date}: ${best.rate}`,
  };
  let out = `${JSON.stringify(next, null, 2)}\n`;
  if (raw.includes('\r\n')) out = out.replace(/\n/g, '\r\n');
  writeFileSync(FILE, out);
  say(`EGP ${next.egpPerUsd} per US$ (${best.date}, ${best.host}); was ${current.egpPerUsd} (${current.asOf})`);
}
