/**
 * The team's everyday moves, as lists of actions the store replays: take a direct booking, move a
 * guest to a free twin unit, fill a calendar import's details. Used by the side panels and the tour.
 */
import { unitByCode } from './catalog';
import { diffDays } from './dates';
import { stayRange } from './format';
import { isFree, live } from './select';
import { stayPrice } from './seed';
import type { Action } from './store';
import type { Channel, DemoData, Guest, Reservation, TeamAlert } from './types';

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

const range = (r: Pick<Reservation, 'checkIn' | 'checkOut'>) => ({
  en: stayRange('en', r.checkIn, r.checkOut),
  ar: stayRange('ar', r.checkIn, r.checkOut),
});

/** The next reference in our own series, e.g. EA-2611-0192. */
export function nextRef(data: DemoData) {
  const ours = data.reservations.filter((r) => r.ref.startsWith('EA-')).map((r) => Number(r.ref.slice(-4)));
  const n = Math.max(190, ...ours) + 1;
  return `EA-${data.today.slice(2, 4)}${data.today.slice(5, 7)}-${String(n).padStart(4, '0')}`;
}

export function blockAlert(res: Reservation, guestName: string): TeamAlert {
  const r = range(res);
  return {
    id: newId('a'),
    at: new Date().toISOString(),
    kind: 'block',
    text: {
      en: `Close ${res.unit} on Airbnb and Booking.com for ${r.en}. ${guestName} booked it directly.`,
      ar: `اقفل ${res.unit} على Airbnb و Booking.com من ${r.ar}. ${guestName} حجز مباشرة.`,
    },
  };
}

export function clashAlert(res: Reservation, other: Reservation): TeamAlert {
  const channel = res.channel === 'airbnb' ? 'Airbnb' : 'Booking.com';
  return {
    id: newId('a'),
    at: new Date().toISOString(),
    kind: 'clash',
    text: {
      en: `Clash on ${res.unit}: a ${channel} booking overlaps ${other.ref}. Both are saved. Fix before the guests arrive.`,
      ar: `تعارض على ${res.unit}: حجز ${channel} متداخل مع ${other.ref}. الحجزين محفوظين. صلّحه قبل وصول الضيوف.`,
    },
  };
}

type DirectInput = {
  unit: string;
  checkIn: string;
  checkOut: string;
  channel: Extract<Channel, 'direct' | 'whatsapp' | 'phone'>;
  name: string;
  phone: string;
  adults: number;
  total?: number;
  paid: boolean;
  guestId?: string;
};

/** A booking we take ourselves. The no-overlap rule applies here, before anything is saved. */
export function takeDirect(data: DemoData, input: DirectInput) {
  if (!isFree(data, input.unit, input.checkIn, input.checkOut)) return { ok: false as const };
  const guest: Guest | undefined = input.guestId
    ? data.guests.find((g) => g.id === input.guestId)
    : { id: newId('g'), name: input.name, phone: input.phone, country: 'EG', language: 'ar', pastStays: 0 };
  if (!guest) return { ok: false as const };
  const total = input.total ?? stayPrice(unitByCode[input.unit], input.checkIn, input.checkOut);
  const reservation: Reservation = {
    id: newId('r'),
    ref: nextRef(data),
    unit: input.unit,
    channel: input.channel,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    adults: input.adults,
    guestId: guest.id,
    total,
    paid: input.paid ? total : 0,
    status: input.paid ? 'confirmed' : 'pending',
    createdAt: new Date().toISOString(),
  };
  const actions: Action[] = [];
  if (!input.guestId) actions.push({ type: 'guest/add', guest });
  actions.push({ type: 'reservation/add', reservation }, { type: 'alert/add', alert: blockAlert(reservation, guest.name) });
  return { ok: true as const, reservation, actions };
}

/** A free unit like this one (same area and kind, at least as many bedrooms) for the same nights. */
export function twinFor(data: DemoData, res: Reservation) {
  const unit = unitByCode[res.unit];
  const candidates = data.units
    .filter((u) => u.code !== unit.code && u.area === unit.area && u.type === unit.type && u.bedrooms >= unit.bedrooms)
    .filter((u) => isFree(data, u.code, res.checkIn, res.checkOut, res.id))
    .sort((a, b) => Number(b.compound === unit.compound) - Number(a.compound === unit.compound) || a.bedrooms - b.bedrooms);
  return candidates[0] ?? null;
}

export function moveTo(res: Reservation, unit: string): Action[] {
  return [{ type: 'reservation/update', id: res.id, patch: { unit } }];
}

/** The other stay a clashing booking overlaps, if any. */
export function clashPartner(data: DemoData, res: Reservation) {
  return live(data).find(
    (r) => r.id !== res.id && r.unit === res.unit && r.checkIn < res.checkOut && res.checkIn < r.checkOut && r.checkOut > data.today,
  );
}

export function nightsOf(res: Pick<Reservation, 'checkIn' | 'checkOut'>) {
  return diffDays(res.checkIn, res.checkOut);
}
