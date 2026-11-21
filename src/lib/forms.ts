/**
 * The site's two forms: a stay request (listing pages) and an owner's unit (homepage and /owners).
 * Both post to the Google Apps Script web app in apps-script/Code.gs, which writes them to the
 * team's Google Sheet, scores owner leads and emails the team. Both also end on a WhatsApp message
 * that's already written, so a request still reaches the team if the sheet can't be reached.
 */
import { site } from './site';

export const LIMITS = { name: 80, email: 120, note: 600, compound: 80, link: 300 } as const;

/** Western digits for anything typed on an Arabic or Persian keyboard (٠١٢… and ۰۱۲…). */
export function westernDigits(text: string) {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * A WhatsApp number as digits with its country code, or null when it can't be one.
 * Egyptian mobiles may be typed the local way (010…, 011…, 012…, 015…); a number from anywhere
 * else needs its country code (+971…, 00971…).
 */
export function normalizePhone(raw: string): string | null {
  const text = westernDigits(raw).replace(/[\s().\-‐-―]/g, '');
  if (!/^\+?\d+$/.test(text)) return null;
  const international = text.startsWith('+') || text.startsWith('00');
  let digits = text.replace(/^\+/, '').replace(/^00/, '');

  if (!international) {
    if (/^01[0125]\d{8}$/.test(digits)) return `20${digits.slice(1)}`; // 010 1234 5678
    if (/^201[0125]\d{8}$/.test(digits)) return digits; // 20 10 1234 5678, the + left out
    return null;
  }
  // "+20 010…": the local 0 kept after the country code.
  if (/^2001[0125]\d{8}$/.test(digits)) digits = `20${digits.slice(3)}`;
  if (digits.startsWith('20')) return /^20\d{9,10}$/.test(digits) ? digits : null;
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/;
export const isEmail = (value: string) => value.trim().length <= LIMITS.email && EMAIL.test(value.trim());

const COMMON_DOMAINS = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'icloud.com', 'live.com'];

function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const kept = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = kept;
    }
  }
  return row[b.length];
}

/** "sara@gmial.com" → "sara@gmail.com". Null when the domain looks fine or isn't close to a common one. */
export function emailSuggestion(value: string): string | null {
  const match = /^([^\s@]+)@([^\s@]+)$/.exec(value.trim());
  if (!match) return null;
  const domain = match[2].toLowerCase();
  if (COMMON_DOMAINS.includes(domain)) return null;
  let best: string | null = null;
  let bestDistance = 3;
  for (const candidate of COMMON_DOMAINS) {
    const d = distance(domain, candidate);
    if (d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best ? `${match[1]}@${best}` : null;
}

/** A short reference the team sees in the sheet and in the WhatsApp message, like EA-7K2QX. */
export function newRef() {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return `EA-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')}`;
}

/**
 * saved: the sheet has it. whatsapp: no sheet is set up for this build, so WhatsApp carries it.
 * failed: the sheet couldn't be reached (offline, timed out, or the browser blocked the call).
 */
export type SendResult = 'saved' | 'whatsapp' | 'failed';

export async function sendForm(payload: Record<string, unknown>): Promise<SendResult> {
  if (!site.formEndpoint) return 'whatsapp';
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15000);
  try {
    // text/plain keeps this a simple request, so the browser doesn't ask Apps Script for CORS rights first.
    const response = await fetch(site.formEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!response.ok) return 'failed';
    const data = (await response.json().catch(() => null)) as { ok?: boolean } | null;
    return data?.ok === true ? 'saved' : 'failed';
  } catch {
    return 'failed';
  } finally {
    window.clearTimeout(timer);
  }
}

/** The page the form was sent from, without its fragment. */
export const pageAddress = () => window.location.href.split('#')[0];

/** Form events for analytics. A no-op until GA4 (or a tag manager) puts a dataLayer on the page. */
export function track(event: string, params: Record<string, string | number | boolean> = {}) {
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer?.push({ event, ...params });
}

/** A form's answers kept for this tab only, so a reload doesn't lose them. Private windows may refuse. */
export const draft = {
  load<T>(key: string): Partial<T> | null {
    try {
      const raw = window.sessionStorage.getItem(key);
      return raw ? (JSON.parse(raw) as Partial<T>) : null;
    } catch {
      return null;
    }
  },
  save(key: string, value: unknown) {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked: the form still works */
    }
  },
  clear(key: string) {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* nothing to clear */
    }
  },
};
