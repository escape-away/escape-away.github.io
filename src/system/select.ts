/**
 * Everything the screens read is worked out here from the records: clashes, arrivals, occupancy,
 * revenue and owner statements. One place, so every screen agrees on every number.
 */
import { unitByCode } from './catalog';
import { addDays, diffDays, monthStart, addMonths, overlapNights, overlaps } from './dates';
import { stayPrice } from './seed';
import type { Channel, DemoData, Owner, Reservation } from './types';

export const live = (data: DemoData) => data.reservations.filter((r) => r.status !== 'cancelled');

/** What a stay is worth: its total, or for a calendar import still owing details, the unit's rates. */
export function valueOf(res: Reservation) {
  return res.total > 0 ? res.total : stayPrice(unitByCode[res.unit], res.checkIn, res.checkOut);
}

/** Room revenue for one night of a stay: the total less cleaning, spread over the nights. */
export function nightValue(res: Reservation) {
  const nights = Math.max(1, diffDays(res.checkIn, res.checkOut));
  return (valueOf(res) - unitByCode[res.unit].cleaningFee) / nights;
}

export type Clash = { unit: string; ids: [string, string]; from: string; to: string };

/** Two live stays on the same unit sharing a night. Saved both, flagged here. */
export function clashes(data: DemoData): Clash[] {
  const found: Clash[] = [];
  const byUnit = new Map<string, Reservation[]>();
  for (const r of live(data)) {
    if (r.checkOut <= data.today) continue;
    const list = byUnit.get(r.unit) ?? [];
    list.push(r);
    byUnit.set(r.unit, list);
  }
  for (const [unit, list] of byUnit) {
    list.sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1));
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const b = list[j];
        if (b.checkIn >= a.checkOut) break;
        if (overlaps(a.checkIn, a.checkOut, b.checkIn, b.checkOut)) {
          found.push({ unit, ids: [a.id, b.id], from: b.checkIn, to: a.checkOut < b.checkOut ? a.checkOut : b.checkOut });
        }
      }
    }
  }
  return found;
}

export const clashIds = (data: DemoData) => new Set(clashes(data).flatMap((c) => c.ids));

export const arrivals = (data: DemoData, day: string) => live(data).filter((r) => r.checkIn === day);
export const departures = (data: DemoData, day: string) => live(data).filter((r) => r.checkOut === day);
export const inHouse = (data: DemoData, day: string) => live(data).filter((r) => r.checkIn <= day && r.checkOut > day);
export const needsDetails = (data: DemoData) => live(data).filter((r) => r.needsDetails && r.checkOut > data.today);
export const pendingPayment = (data: DemoData) => live(data).filter((r) => r.status === 'pending');

export function blockedNights(data: DemoData, from: string, to: string, units?: Set<string>) {
  return data.blocks
    .filter((b) => !units || units.has(b.unit))
    .reduce((sum, b) => sum + overlapNights(b.start, b.end, from, to), 0);
}

/** Booked nights and room revenue in [from, to), optionally for some units. */
export function performance(data: DemoData, from: string, to: string, units?: Set<string>) {
  let nights = 0;
  let revenue = 0;
  for (const r of live(data)) {
    if (units && !units.has(r.unit)) continue;
    const n = overlapNights(r.checkIn, r.checkOut, from, to);
    if (!n) continue;
    nights += n;
    revenue += n * nightValue(r);
  }
  const count = units ? units.size : data.units.length;
  const available = Math.max(1, count * diffDays(from, to) - blockedNights(data, from, to, units));
  return {
    nights,
    revenue,
    occupancy: nights / available,
    adr: nights ? revenue / nights : 0,
    revpar: revenue / available,
  };
}

export function revenueByChannel(data: DemoData, from: string, to: string) {
  const out: Record<Channel, number> = { airbnb: 0, booking: 0, direct: 0, whatsapp: 0, phone: 0 };
  for (const r of live(data)) {
    const n = overlapNights(r.checkIn, r.checkOut, from, to);
    if (n) out[r.channel] += n * nightValue(r);
  }
  return out;
}

/** What each channel keeps: Airbnb's host fee, Booking.com's commission, Paymob's card fee. */
export const channelFee: Record<Channel, number> = {
  airbnb: 0.03,
  booking: 0.15,
  direct: 0.0275,
  whatsapp: 0.0275,
  phone: 0.0275,
};

export type StatementLine = {
  res: Reservation;
  nights: number;
  gross: number;
  fee: number;
};

/** One owner's month: every stay's nights in the month, the channels' cut, our commission, the payout. */
export function statement(data: DemoData, owner: Owner, month: string) {
  const from = monthStart(month);
  const to = monthStart(addMonths(month, 1));
  const unitCodes = new Set(data.units.filter((u) => u.ownerId === owner.id).map((u) => u.code));
  const lines: StatementLine[] = [];
  for (const r of live(data)) {
    if (!unitCodes.has(r.unit)) continue;
    const nights = overlapNights(r.checkIn, r.checkOut, from, to);
    if (!nights) continue;
    const gross = nights * nightValue(r);
    lines.push({ res: r, nights, gross, fee: gross * channelFee[r.channel] });
  }
  lines.sort((a, b) => (a.res.checkIn < b.res.checkIn ? -1 : 1));
  const gross = lines.reduce((s, l) => s + l.gross, 0);
  const fees = lines.reduce((s, l) => s + l.fee, 0);
  const net = gross - fees;
  const commission = net * owner.commission;
  // Upkeep the sample charges per home a month: consumables and small repairs.
  const upkeep = unitCodes.size * 650 + (lines.length ? lines.length * 120 : 0);
  return {
    units: [...unitCodes],
    lines,
    nights: lines.reduce((s, l) => s + l.nights, 0),
    gross,
    fees,
    net,
    commission,
    upkeep,
    payout: Math.max(0, net - commission - upkeep),
  };
}

export function unitStays(data: DemoData, unit: string) {
  return live(data)
    .filter((r) => r.unit === unit)
    .sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1));
}

/** The next stretch of free nights on a unit from a date, at least `nights` long. */
export function freeFrom(data: DemoData, unit: string, from: string, nights: number) {
  const stays = unitStays(data, unit);
  let start = from;
  for (let guard = 0; guard < 120; guard += 1) {
    const end = addDays(start, nights);
    const blocking =
      stays.find((r) => overlaps(r.checkIn, r.checkOut, start, end)) ??
      data.blocks.find((b) => b.unit === unit && overlaps(b.start, b.end, start, end));
    if (!blocking) return start;
    start = 'checkOut' in blocking ? blocking.checkOut : blocking.end;
  }
  return null;
}

export function isFree(data: DemoData, unit: string, checkIn: string, checkOut: string, ignore?: string) {
  return (
    !live(data).some((r) => r.unit === unit && r.id !== ignore && overlaps(r.checkIn, r.checkOut, checkIn, checkOut)) &&
    !data.blocks.some((b) => b.unit === unit && overlaps(b.start, b.end, checkIn, checkOut))
  );
}
