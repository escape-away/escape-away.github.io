/**
 * Builds the demo's moving parts around today's date: six months of past stays and three months of
 * future ones for every unit, with each area's real season (the North Coast and El Alamein empty in
 * winter and full in summer, Gouna busiest in winter, Cairo steady), plus today's turnovers, open
 * tickets, owner leads and calendar links. Deterministic: the same day always gives the same data.
 */
import { fixerFor, housekeeperFor, owners, samplePhone, staff, unitByCode, units } from './catalog';
import { addDays, addMonths, isWeekendNight, monthOf, monthStart, overlaps, weekday } from './dates';
import { stayRange } from './format';
import type {
  AreaId,
  Block,
  Channel,
  DemoData,
  Feed,
  Guest,
  Lead,
  Payout,
  Reservation,
  Task,
  TeamAlert,
  Unit,
} from './types';

/* ---------- A small seeded random source ---------- */

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function random(seed: string) {
  let a = hash(seed);
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T,>(list: readonly T[]) => list[Math.floor(next() * list.length)],
    chance: (p: number) => next() < p,
    weighted: <T extends string>(weights: Record<T, number>) => {
      const entries = Object.entries(weights) as [T, number][];
      let roll = next() * entries.reduce((s, [, w]) => s + w, 0);
      for (const [key, w] of entries) {
        roll -= w;
        if (roll < 0) return key;
      }
      return entries[entries.length - 1][0];
    },
  };
}

/* ---------- Seasons ---------- */

/** Share of nights booked, by area and month (1–12). */
const occupancy: Record<AreaId, number[]> = {
  'north-coast': [0, 0.14, 0.12, 0.2, 0.34, 0.45, 0.8, 0.95, 0.95, 0.6, 0.3, 0.14, 0.24],
  'el-alamein': [0, 0.24, 0.2, 0.3, 0.44, 0.5, 0.8, 0.92, 0.92, 0.6, 0.36, 0.24, 0.34],
  gouna: [0, 0.82, 0.8, 0.76, 0.7, 0.55, 0.45, 0.5, 0.5, 0.56, 0.72, 0.8, 0.86],
  cairo: [0, 0.7, 0.68, 0.62, 0.66, 0.66, 0.58, 0.52, 0.52, 0.64, 0.7, 0.72, 0.74],
  'sheikh-zayed': [0, 0.56, 0.54, 0.5, 0.56, 0.56, 0.5, 0.46, 0.46, 0.54, 0.58, 0.6, 0.64],
};

/** How far the nightly rate moves with the season, on top of the winter base. */
const seasonRate: Record<AreaId, number[]> = {
  'north-coast': [0, 1, 1, 1, 1.2, 1.4, 2, 2.6, 2.6, 1.7, 1.2, 1, 1.1],
  'el-alamein': [0, 1, 1, 1, 1.2, 1.3, 1.9, 2.4, 2.4, 1.6, 1.2, 1, 1.1],
  gouna: [0, 1.15, 1.15, 1.1, 1.1, 1, 0.95, 1, 1, 1, 1.05, 1.1, 1.2],
  cairo: [0, 1, 1, 1, 1, 1, 0.95, 0.95, 0.95, 1, 1, 1, 1.05],
  'sheikh-zayed': [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.05],
};

const monthNo = (iso: string) => Number(iso.slice(5, 7));

/** One night's price: season, Thursday and Friday nights, and New Year's Eve. */
export function nightlyRate(unit: Unit, night: string) {
  let rate = unit.rate * seasonRate[unit.area][monthNo(night)];
  if (isWeekendNight(night)) rate *= 1.15;
  const md = night.slice(5);
  if (md === '12-31') rate *= 1.6;
  else if (md === '12-30' || md === '12-24') rate *= 1.25;
  return Math.round(rate / 50) * 50;
}

export function stayPrice(unit: Unit, checkIn: string, checkOut: string) {
  let sum = 0;
  for (let n = checkIn; n < checkOut; n = addDays(n, 1)) sum += nightlyRate(unit, n);
  return sum + unit.cleaningFee;
}

/* ---------- Guests ---------- */

const egyptian = [
  'Mona Adel', 'Youssef Kamal', 'Farida Nabil', 'Ali Hassan', 'Layla Ibrahim', 'Omar Khaled', 'Nour Samy',
  'Hana Mostafa', 'Ziad Samir', 'Malak Tamer', 'Mariam Ehab', 'Seif Gamal', 'Jana Hesham', 'Adam Wael',
  'Habiba Ashraf', 'Ahmed Zaher', 'Nada Sherif', 'Karim Fathy', 'Rana Magdy', 'Mazen Osama', 'Salma Hatem',
  'Hassan Reda', 'Dalia Saad', 'Tamer Nasr', 'Yasmine Galal', 'Mostafa Anwar', 'Aya Lotfy', 'Hossam Badr',
  'Nourhan Fikry', 'Amr Sedky', 'Menna Rashed', 'Sherif Kassem', 'Laila Ezzat', 'Khaled Sobhy',
];
const egyptianArabic = ['منى عادل', 'يوسف كمال', 'فريدة نبيل', 'علي حسن', 'ليلى إبراهيم', 'عمر خالد', 'نور سامي', 'هنا مصطفى'];
const gulf = [
  'Abdulrahman Al Harbi', 'Noura Al Qahtani', 'Fahad Al Otaibi', 'Maryam Al Mansouri', 'Saeed Al Ketbi',
  'Reem Al Dosari', 'Hamad Al Kuwari', 'Latifa Al Shamsi', 'Mishal Al Ajmi', 'Shaikha Al Marri',
];
const international = [
  'Sophie Laurent', 'Lukas Becker', 'Emma Rossi', 'James Carter', 'Anna Kowalski', 'Marco Bianchi',
  'Chloe Martin', 'Daniel Novak', 'Ingrid Larsen', 'Tom Hughes', 'Elena Petrova', 'Pieter de Vries',
];
const gulfCountries = ['SA', 'AE', 'KW', 'QA', 'BH'];
const worldCountries = ['FR', 'DE', 'IT', 'GB', 'PL', 'IT', 'FR', 'CZ', 'NO', 'GB', 'RU', 'NL'];

function buildGuests(): Guest[] {
  const list: Guest[] = [];
  egyptian.forEach((name, i) =>
    list.push({ id: `g-eg-${i}`, name, phone: samplePhone(100 + i), country: 'EG', language: i % 3 === 0 ? 'en' : 'ar', pastStays: i % 5 === 0 ? 2 : i % 7 === 0 ? 1 : 0 }),
  );
  egyptianArabic.forEach((name, i) =>
    list.push({ id: `g-ea-${i}`, name, phone: samplePhone(200 + i), country: 'EG', language: 'ar', pastStays: i % 3 === 0 ? 1 : 0 }),
  );
  gulf.forEach((name, i) =>
    list.push({
      id: `g-gf-${i}`,
      name,
      phone: `+${[966, 971, 965, 974, 973][i % 5]} 5${String(1000000 + i * 7919).slice(-7)}`,
      country: gulfCountries[i % 5],
      language: 'ar',
      pastStays: i % 4 === 0 ? 1 : 0,
    }),
  );
  international.forEach((name, i) =>
    list.push({ id: `g-in-${i}`, name, phone: `+${[33, 49, 39, 44, 48, 39, 33, 420, 47, 44, 7, 31][i]} ${String(600000000 + i * 104729).slice(0, 9)}`, country: worldCountries[i], language: 'en', pastStays: 0 }),
  );
  return list;
}

/*
 * Most stays bring a new guest; about one in eight is one of the regulars above. Names are put
 * together from common first and family names, leaving out family names that would land on a
 * well-known person.
 */
const egFirst = [
  'Mona', 'Youssef', 'Farida', 'Ali', 'Layla', 'Omar', 'Nour', 'Hana', 'Ziad', 'Malak', 'Mariam', 'Seif', 'Jana',
  'Adam', 'Habiba', 'Ahmed', 'Nada', 'Karim', 'Rana', 'Mazen', 'Salma', 'Hassan', 'Dalia', 'Yasmine', 'Mostafa',
  'Aya', 'Hossam', 'Nourhan', 'Amr', 'Menna', 'Laila', 'Khaled', 'Hoda', 'Mahmoud', 'Reem', 'Tarek', 'Dina',
  'Walid', 'Sara', 'Heba', 'Mohab', 'Lina', 'Yehia', 'Rawan', 'Marwan', 'Nadine', 'Hazem', 'Shahd', 'Ramy', 'Farah',
];
const egLast = [
  'Adel', 'Kamal', 'Nabil', 'Ibrahim', 'Samy', 'Samir', 'Ehab', 'Gamal', 'Hesham', 'Wael', 'Ashraf', 'Fathy',
  'Magdy', 'Osama', 'Galal', 'Anwar', 'Lotfy', 'Badr', 'Fikry', 'Rashed', 'Kassem', 'Ezzat', 'Sobhy', 'Ragab',
  'Mansour', 'Soliman', 'Naguib', 'Hamdy', 'Wahba', 'Atef', 'Barakat', 'Ghali', 'Moussa', 'Fawzy', 'Selim',
  'Habib', 'Fekry', 'Rizk', 'Talaat', 'Abdou', 'Khalil', 'El Sayed', 'Farouk', 'Gaber', 'Darwish', 'Ismail',
  'Tawfik', 'Adly', 'Younis', 'Hafez',
];
const arFirst = ['منى', 'يوسف', 'فريدة', 'علي', 'ليلى', 'عمر', 'نور', 'هنا', 'زياد', 'ملك', 'مريم', 'سيف', 'جنى', 'آدم', 'حبيبة', 'أحمد', 'ندى', 'كريم', 'رنا', 'مازن', 'سلمى', 'حسن', 'داليا', 'ياسمين', 'مصطفى', 'آية', 'حسام', 'منة', 'خالد', 'هدى'];
const arLast = ['عادل', 'كمال', 'نبيل', 'إبراهيم', 'سامي', 'سمير', 'إيهاب', 'جمال', 'هشام', 'وائل', 'أشرف', 'فتحي', 'مجدي', 'أسامة', 'جلال', 'أنور', 'لطفي', 'بدر', 'فكري', 'راشد', 'قاسم', 'عزت', 'صبحي', 'رجب', 'منصور', 'سليمان', 'نجيب', 'حمدي', 'وهبة', 'عاطف'];
const gfFirst = ['Abdulrahman', 'Noura', 'Fahad', 'Maryam', 'Saeed', 'Reem', 'Hamad', 'Latifa', 'Mishal', 'Shaikha', 'Khalid', 'Hessa', 'Sultan', 'Mouza', 'Nasser', 'Alanoud', 'Turki', 'Dana', 'Majed', 'Lulwa'];
const gfLast: Array<[string, string, number]> = [
  ['Al Harbi', 'SA', 966], ['Al Qahtani', 'SA', 966], ['Al Otaibi', 'SA', 966], ['Al Dosari', 'SA', 966],
  ['Al Mansouri', 'AE', 971], ['Al Ketbi', 'AE', 971], ['Al Shamsi', 'AE', 971], ['Al Zaabi', 'AE', 971],
  ['Al Kaabi', 'AE', 971], ['Al Shehhi', 'AE', 971], ['Al Kuwari', 'QA', 974], ['Al Marri', 'QA', 974],
  ['Al Hajri', 'QA', 974], ['Al Ajmi', 'KW', 965], ['Al Mutawa', 'KW', 965], ['Al Rashidi', 'KW', 965], ['Al Mulla', 'BH', 973],
];
const inFirst = ['Sophie', 'Lukas', 'Emma', 'James', 'Anna', 'Marco', 'Chloe', 'Daniel', 'Ingrid', 'Tom', 'Elena', 'Pieter', 'Julia', 'Max', 'Clara', 'Oliver', 'Mia', 'Leon', 'Sofia', 'Hugo', 'Nora', 'Felix', 'Amelie', 'Jonas', 'Lucia', 'Matteo', 'Hannah', 'Paul', 'Eva', 'Liam'];
const inLast: Array<[string, string, number]> = [
  ['Laurent', 'FR', 33], ['Moreau', 'FR', 33], ['Dubois', 'FR', 33], ['Blanc', 'FR', 33], ['Becker', 'DE', 49],
  ['Schmidt', 'DE', 49], ['Weber', 'DE', 49], ['Fischer', 'DE', 49], ['Meyer', 'DE', 49], ['Rossi', 'IT', 39],
  ['Bianchi', 'IT', 39], ['Ricci', 'IT', 39], ['Conti', 'IT', 39], ['Greco', 'IT', 39], ['Carter', 'GB', 44],
  ['Hughes', 'GB', 44], ['Wilson', 'GB', 44], ['Brown', 'GB', 44], ['Kowalski', 'PL', 48], ['Novak', 'CZ', 420],
  ['Larsen', 'NO', 47], ['de Vries', 'NL', 31], ['Jansen', 'NL', 31], ['Lindqvist', 'SE', 46], ['Nielsen', 'DK', 45],
  ['Horvat', 'HR', 385], ['Costa', 'PT', 351], ['Walsh', 'IE', 353], ['Kovacs', 'HU', 36],
];

function oneOffGuest(id: string, area: AreaId, channel: Channel, r: ReturnType<typeof random>): Guest {
  const roll = r.next();
  const kind =
    channel === 'whatsapp' || channel === 'phone'
      ? roll < 0.4 ? 'ar' : 'eg'
      : area === 'gouna'
        ? roll < 0.45 ? 'in' : roll < 0.7 ? 'gf' : 'eg'
        : area === 'north-coast' || area === 'el-alamein'
          ? roll < 0.25 ? 'gf' : 'eg'
          : roll < 0.15 ? 'in' : roll < 0.3 ? 'gf' : 'eg';
  const digits = r.int(1000, 99999);
  if (kind === 'ar') return { id, name: `${r.pick(arFirst)} ${r.pick(arLast)}`, phone: samplePhone(digits), country: 'EG', language: 'ar', pastStays: 0 };
  if (kind === 'eg') return { id, name: `${r.pick(egFirst)} ${r.pick(egLast)}`, phone: samplePhone(digits), country: 'EG', language: r.chance(0.3) ? 'en' : 'ar', pastStays: 0 };
  if (kind === 'gf') {
    const [last, country, code] = r.pick(gfLast);
    return { id, name: `${r.pick(gfFirst)} ${last}`, phone: `+${code} 5${String(1000000 + digits * 37).slice(-7)}`, country, language: 'ar', pastStays: 0 };
  }
  const [last, country, code] = r.pick(inLast);
  return { id, name: `${r.pick(inFirst)} ${last}`, phone: `+${code} ${String(600000000 + digits * 4111).slice(0, 9)}`, country, language: 'en', pastStays: 0 };
}

/* ---------- Stays ---------- */

const channelMix: Record<AreaId, Record<Channel, number>> = {
  cairo: { airbnb: 46, booking: 26, direct: 9, whatsapp: 13, phone: 6 },
  'sheikh-zayed': { airbnb: 40, booking: 22, direct: 10, whatsapp: 20, phone: 8 },
  'north-coast': { airbnb: 38, booking: 18, direct: 12, whatsapp: 22, phone: 10 },
  'el-alamein': { airbnb: 40, booking: 24, direct: 10, whatsapp: 18, phone: 8 },
  gouna: { airbnb: 36, booking: 40, direct: 8, whatsapp: 11, phone: 5 },
};

function stayLength(area: AreaId, month: number, r: ReturnType<typeof random>) {
  if (area === 'cairo') return r.weighted({ short: 60, mid: 26, month: 14 }) === 'short' ? r.int(2, 4) : r.chance(0.65) ? r.int(5, 9) : r.int(14, 28);
  if (area === 'sheikh-zayed') return r.int(2, 6);
  if (area === 'gouna') return r.int(3, 7);
  const summer = month >= 6 && month <= 9;
  return summer ? r.int(3, 7) : r.int(2, 3);
}

const alnum = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function refFor(channel: Channel, r: ReturnType<typeof random>, created: string, seq: number) {
  if (channel === 'airbnb') return `HM${Array.from({ length: 8 }, () => r.pick(alnum.split(''))).join('')}`;
  if (channel === 'booking') return String(r.int(3100000000, 4999999999));
  return `EA-${created.slice(2, 4)}${created.slice(5, 7)}-${String(seq).padStart(4, '0')}`;
}

const at = (date: string, hh: number, mm = 0) => `${date}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00+02:00`;

function buildStays(today: string, guests: Guest[]) {
  const from = monthStart(addMonths(monthOf(today), -5));
  const until = addDays(today, 92);
  const reservations: Reservation[] = [];
  const newGuests: Guest[] = [];
  let seq = 140;

  for (const unit of units) {
    const r = random(`stays:${unit.code}`);
    const mix = { ...channelMix[unit.area] };
    if (!unit.channels.booking) mix.booking = 0;
    let cursor = addDays(from, r.int(0, 6));
    let n = 0;

    while (cursor < until) {
      const month = monthNo(cursor);
      const occ = occupancy[unit.area][month];
      const length = stayLength(unit.area, month, r);
      // The empty nights before the next stay, so the month lands near its occupancy.
      const meanGap = (length * (1 - occ)) / Math.max(occ, 0.05);
      let gap = Math.round(-Math.log(1 - r.next()) * meanGap);
      let checkIn = addDays(cursor, gap);
      // Out of season on the coast, guests come for the weekend: arrive on a Thursday.
      if ((unit.area === 'north-coast' || unit.area === 'el-alamein') && occ < 0.5 && r.chance(0.7)) {
        while (weekday(checkIn) !== 4) checkIn = addDays(checkIn, 1);
      }
      const checkOut = addDays(checkIn, length);
      if (checkIn >= until) break;

      const channel = r.weighted(mix);
      const lead = Math.min(60, Math.max(1, Math.round(-Math.log(1 - r.next()) * (occ > 0.7 ? 24 : 12))));
      // Booked some days before arrival; stays far ahead were booked earlier than the usual lead time.
      let createdDay = addDays(checkIn, -lead);
      if (createdDay >= today) createdDay = addDays(today, -r.int(1, 40));
      const created = at(createdDay, r.int(8, 22), r.int(0, 59));
      const regular = r.chance(0.12);
      const guest = regular ? pickGuest(unit.area, channel, guests, r) : oneOffGuest(`g-${unit.code}-${n}`, unit.area, channel, r);
      const total = stayPrice(unit, checkIn, checkOut);

      let status: Reservation['status'];
      if (checkOut < today) status = 'checked-out';
      else if (checkOut === today) status = r.chance(0.5) ? 'checked-out' : 'checked-in';
      else if (checkIn < today) status = 'checked-in';
      else if (checkIn === today) status = r.chance(0.25) ? 'checked-in' : 'confirmed';
      else status = (channel === 'direct' || channel === 'whatsapp') && checkIn > addDays(today, 2) && r.chance(0.08) ? 'pending' : 'confirmed';
      if (status !== 'checked-in' && r.chance(0.035)) status = 'cancelled';

      const ota = channel === 'airbnb' || channel === 'booking';
      // A booking that reached us through a calendar link yesterday still owes its details.
      const fresh = ota && checkIn > today && createdDay === addDays(today, -1) && status === 'confirmed' && r.chance(0.8);

      reservations.push({
        id: `${unit.code}-${n}`,
        ref: refFor(channel, r, createdDay, seq),
        unit: unit.code,
        channel,
        checkIn,
        checkOut,
        adults: Math.max(1, Math.min(unit.guests, r.int(Math.ceil(unit.guests / 2), unit.guests))),
        guestId: fresh ? undefined : guest.id,
        total: fresh ? 0 : total,
        paid: status === 'pending' ? 0 : fresh ? 0 : status === 'cancelled' ? 0 : total,
        status,
        needsDetails: fresh || undefined,
        syncedAt: ota ? at(createdDay, Math.min(23, Number(created.slice(11, 13)) + 0), Math.min(59, Number(created.slice(14, 16)) + r.int(4, 20))) : undefined,
        createdAt: created,
      });
      if (!regular && !fresh) newGuests.push(guest);
      if (!ota) seq += 1;
      n += 1;
      cursor = checkOut;
    }
  }
  return { reservations, newGuests };
}

function pickGuest(area: AreaId, channel: Channel, guests: Guest[], r: ReturnType<typeof random>) {
  const pool = (prefix: string) => guests.filter((g) => g.id.startsWith(prefix));
  if (channel === 'whatsapp' || channel === 'phone') return r.pick(r.chance(0.45) ? pool('g-ea') : pool('g-eg'));
  const roll = r.next();
  if (area === 'gouna') return r.pick(roll < 0.45 ? pool('g-in') : roll < 0.7 ? pool('g-gf') : pool('g-eg'));
  if (area === 'north-coast' || area === 'el-alamein') return r.pick(roll < 0.25 ? pool('g-gf') : pool('g-eg'));
  return r.pick(roll < 0.15 ? pool('g-in') : roll < 0.3 ? pool('g-gf') : pool('g-eg'));
}

/* ---------- The clash, blocks, tasks ---------- */

/**
 * One clash is already on the board when the demo opens: a Booking.com booking that came in through
 * the calendar link before the team had closed a WhatsApp booking's nights there. It is saved, never
 * rejected, and flagged.
 */
function addOpeningClash(today: string, reservations: Reservation[]) {
  const unit = 'GN-ATM-009';
  const twin = 'GN-ATM-014';
  const checkIn = addDays(today, 5);
  const checkOut = addDays(today, 9);
  // Clear that stretch, then lay the two clashing stays over it. The identical apartment next door is
  // left free on those nights, so "Review" can offer the one-click move.
  for (const res of reservations) {
    if ((res.unit === unit || res.unit === twin) && res.status !== 'cancelled' && overlaps(res.checkIn, res.checkOut, addDays(checkIn, -1), addDays(checkOut, 2))) {
      res.status = 'cancelled';
    }
  }
  const u = unitByCode[unit];
  const total = stayPrice(u, checkIn, checkOut);
  reservations.push(
    {
      id: `${unit}-wa`,
      ref: 'EA-2611-0187',
      unit,
      channel: 'whatsapp',
      checkIn,
      checkOut,
      adults: 3,
      guestId: 'g-eg-9',
      total,
      paid: Math.round(total * 0.3),
      status: 'confirmed',
      createdAt: at(addDays(today, -1), 21, 14),
    },
    {
      id: `${unit}-bk`,
      ref: '4127730518',
      unit,
      channel: 'booking',
      checkIn: addDays(checkIn, 2),
      checkOut: addDays(checkOut, 1),
      adults: 2,
      total: 0,
      paid: 0,
      status: 'confirmed',
      needsDetails: true,
      syncedAt: at(addDays(today, -1), 22, 47),
      createdAt: at(addDays(today, -1), 22, 31),
    },
  );
}

/**
 * The housekeeping app is clearest when one clean has a guest arriving the same afternoon. If the
 * day's sample has none, add one Airbnb arrival on a unit someone leaves today, in the busiest area.
 */
function addSameDayTurnover(today: string, reservations: Reservation[], blocks: Block[]) {
  const live = reservations.filter((r) => r.status !== 'cancelled');
  const leaving = live.filter((r) => r.checkOut === today);
  if (leaving.some((r) => live.some((x) => x.unit === r.unit && x.checkIn === today))) return;
  const byArea = new Map<AreaId, Reservation[]>();
  for (const r of leaving) {
    const area = unitByCode[r.unit].area;
    byArea.set(area, [...(byArea.get(area) ?? []), r]);
  }
  const busiest = [...byArea.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  const checkOut = addDays(today, 3);
  for (const r of busiest) {
    const taken =
      live.some((x) => x.unit === r.unit && overlaps(x.checkIn, x.checkOut, today, checkOut)) ||
      blocks.some((b) => b.unit === r.unit && overlaps(b.start, b.end, today, checkOut));
    if (taken) continue;
    const unit = unitByCode[r.unit];
    const total = stayPrice(unit, today, checkOut);
    reservations.push({
      id: `${r.unit}-sameday`,
      ref: 'HMR7TQ4XKC',
      unit: r.unit,
      channel: 'airbnb',
      checkIn: today,
      checkOut,
      adults: Math.min(unit.guests, 2),
      guestId: 'g-in-0',
      total,
      paid: total,
      status: 'confirmed',
      syncedAt: at(addDays(today, -6), 14, 12),
      createdAt: at(addDays(today, -6), 13, 58),
    });
    return;
  }
}

function buildBlocks(today: string): Block[] {
  return [
    { id: 'b-1', unit: 'NC-MRS-011', start: addDays(today, 34), end: addDays(today, 41), reason: 'owner' },
    { id: 'b-2', unit: 'NC-HCB-012', start: addDays(today, 37), end: addDays(today, 40), reason: 'owner' },
    { id: 'b-3', unit: 'SZ-ALG-014', start: addDays(today, 12), end: addDays(today, 15), reason: 'owner' },
    { id: 'b-4', unit: 'CA-MVD-015', start: addDays(today, -1), end: addDays(today, 2), reason: 'maintenance' },
    { id: 'b-5', unit: 'AL-MZR-017', start: addDays(today, 6), end: addDays(today, 9), reason: 'maintenance' },
  ];
}

function clearBlocks(blocks: Block[], reservations: Reservation[]) {
  for (const b of blocks) {
    for (const res of reservations) {
      if (res.unit === b.unit && res.status !== 'cancelled' && overlaps(res.checkIn, res.checkOut, b.start, b.end)) res.status = 'cancelled';
    }
  }
}

function buildTasks(today: string, reservations: Reservation[]): Task[] {
  const tasks: Task[] = [];
  const live = reservations.filter((r) => r.status !== 'cancelled');
  for (const day of [today, addDays(today, 1)]) {
    for (const res of live.filter((x) => x.checkOut === day)) {
      const unit = unitByCode[res.unit];
      const r = random(`task:${res.id}`);
      const next = live.find((x) => x.unit === res.unit && x.checkIn === day);
      const status: Task['status'] =
        day > today ? 'todo' : res.status === 'checked-out' ? (r.chance(0.5) ? 'done' : 'doing') : 'todo';
      tasks.push({
        id: `t-${res.id}`,
        unit: res.unit,
        type: 'turnover',
        date: day,
        window: next ? ['12:00', '15:00'] : ['12:00', '17:00'],
        staffId: housekeeperFor(unit.area).id,
        status,
        reservationId: res.id,
      });
    }
  }
  const issues: Array<[string, string, string]> = [
    ['CA-MVD-015', 'The master bedroom air conditioner is not cooling.', 'تكييف غرفة النوم الرئيسية مش بيبرّد.'],
    ['NC-HCB-004', 'The water heater is leaking under the sink.', 'السخان بيسرّب مية تحت الحوض.'],
    ['GN-ATM-017', 'The smart lock battery is low.', 'بطارية القفل الذكي ضعيفة.'],
  ];
  issues.forEach(([code, en, ar], i) => {
    tasks.push({
      id: `m-${i}`,
      unit: code,
      type: 'maintenance',
      date: addDays(today, i === 0 ? 0 : i),
      window: ['10:00', '13:00'],
      staffId: fixerFor(unitByCode[code].area).id,
      status: i === 0 ? 'doing' : 'todo',
      issue: { en, ar },
    });
  });
  return tasks;
}

/* ---------- Owner leads ---------- */

function buildLeads(today: string): Lead[] {
  const d = (n: number) => addDays(today, n);
  const l = (
    id: string, name: string, area: AreaId, en: string, ar: string, type: Lead['type'], bedrooms: number, furnished: boolean,
    stage: Lead['stage'], score: Lead['score'], source: Lead['source'], created: number, followUp: number | null, noteEn?: string, noteAr?: string,
  ): Lead => ({
    id, name, phone: samplePhone(300 + id.length * 13 + created * -7), area, compound: { en, ar }, type, bedrooms, furnished, stage, score, source,
    createdAt: at(d(created), 11, 20), followUp: followUp == null ? undefined : d(followUp),
    note: noteEn ? { en: noteEn, ar: noteAr ?? noteEn } : undefined,
  });
  return [
    l('l-1', 'Amira Farouk', 'north-coast', 'Marassi', 'مراسي', 'chalet', 3, true, 'new', 'hot', 'website', 0, 0, 'Sea-view chalet, furnished, wants it listed before New Year.', 'شاليه مطل على البحر ومفروش، عايزة تعرضه قبل رأس السنة.'),
    l('l-2', 'Mohamed Saleh', 'cairo', 'Mivida', 'ميفيدا', 'apartment', 2, true, 'new', 'warm', 'instagram', 0, 1),
    l('l-3', 'Rania Gaber', 'gouna', 'Abu Tig Marina', 'مارينا أبو تيج', 'apartment', 1, false, 'new', 'cool', 'website', -1, 2, 'Unfurnished; asked about the full-service package.', 'مش مفروشة؛ سألت عن باقة الخدمة الكاملة.'),
    l('l-4', 'Hesham Nour', 'sheikh-zayed', 'Westown', 'ويستاون', 'apartment', 2, true, 'new', 'nurture', 'whatsapp', -1, 7),
    l('l-5', 'Samar El Masry', 'el-alamein', 'Alamein Towers', 'أبراج العلمين', 'apartment', 2, true, 'contacted', 'hot', 'referral', -3, 0, 'Referred by Nadia El Sherif. Lives in Dubai.', 'مرشحة من نادية الشريف. عايشة في دبي.'),
    l('l-6', 'Wael Darwish', 'north-coast', 'Hacienda Bay', 'هاسيندا باي', 'villa', 4, true, 'contacted', 'warm', 'website', -4, 1),
    l('l-7', 'Dalia Kamel', 'cairo', 'Cairo Festival City', 'كايرو فستيفال سيتي', 'studio', 0, true, 'contacted', 'cool', 'instagram', -6, 3),
    l('l-8', 'Ihab Zaki', 'gouna', 'West Golf', 'ويست جولف', 'villa', 3, true, 'visit', 'hot', 'referral', -8, 1, 'Visit booked with the Gouna team.', 'معاد المعاينة اتحدد مع فريق الجونة.'),
    l('l-9', 'Noha Ismail', 'cairo', 'Eastown', 'إيستاون', 'apartment', 1, true, 'visit', 'warm', 'website', -9, 2),
    l('l-10', 'Ahmed Tawfik', 'north-coast', 'Swan Lake', 'سوان ليك', 'chalet', 2, false, 'visit', 'warm', 'whatsapp', -11, 4),
    l('l-11', 'Mariam Selim', 'sheikh-zayed', 'Allegria', 'أليجريا', 'townhouse', 3, true, 'signed', 'hot', 'website', -19, null, 'Contract signed; photoshoot next week.', 'العقد اتمضى؛ التصوير الأسبوع الجاي.'),
    l('l-12', 'Sherine Adly', 'el-alamein', 'Mazarine', 'مازارين', 'apartment', 2, true, 'signed', 'warm', 'referral', -24, null),
    l('l-13', 'Bahaa Younis', 'cairo', 'Mountain View iCity', 'ماونتن فيو آي سيتي', 'apartment', 1, false, 'lost', 'cool', 'instagram', -15, null, 'Chose to rent it out yearly.', 'اختار يأجرها سنوي.'),
    l('l-14', 'Lobna Hafez', 'north-coast', 'Marassi', 'مراسي', 'apartment', 1, true, 'lost', 'nurture', 'website', -21, null),
  ];
}

/* ---------- Calendar links, alerts, payouts ---------- */

function buildFeeds(now: Date): Feed[] {
  const feeds: Feed[] = [];
  units.forEach((u, i) => {
    for (const channel of ['airbnb', 'booking'] as const) {
      if (!u.channels[channel]) continue;
      const failing = u.code === 'AL-MZR-008' && channel === 'booking';
      const minutes = failing ? 186 : 2 + ((i * 7 + (channel === 'booking' ? 5 : 0)) % 24);
      feeds.push({ unit: u.code, channel, lastSync: new Date(now.getTime() - minutes * 60_000).toISOString(), ok: !failing });
    }
  });
  return feeds;
}

function buildPayouts(today: string): Payout[] {
  const last = addMonths(monthOf(today), -1);
  return owners.flatMap((o, i) => [
    { ownerId: o.id, month: last, status: i % 9 === 4 ? ('approved' as const) : ('paid' as const) },
    { ownerId: o.id, month: monthOf(today), status: 'draft' as const },
  ]);
}

/**
 * What the system sent the team on WhatsApp since yesterday: a "close these nights" request for each
 * booking taken directly (until Channex, the platforms learn of them only hours later), and a note
 * for each clean finished today.
 */
function teamMessages(today: string, now: Date, reservations: Reservation[], guests: Guest[], tasks: Task[]): TeamAlert[] {
  const nb = ' ';
  const names = new Map(guests.map((g) => [g.id, g.name]));
  const how = {
    direct: { en: 'on the website', ar: 'من الموقع' },
    whatsapp: { en: 'on WhatsApp', ar: 'على واتساب' },
    phone: { en: 'by phone', ar: 'بالتليفون' },
  } as const;
  const direct = reservations
    .filter((r) => r.status !== 'cancelled' && (r.channel === 'direct' || r.channel === 'whatsapp' || r.channel === 'phone'))
    .filter((r) => r.createdAt.slice(0, 10) === addDays(today, -1) && r.checkIn >= today)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 3)
    .map((r): TeamAlert => {
      const via = how[r.channel as keyof typeof how];
      const name = (r.guestId && names.get(r.guestId)) || '';
      const at = new Date(new Date(r.createdAt).getTime() + 2 * 60_000).toISOString();
      return {
        id: `a-${r.id}`,
        at,
        kind: 'block',
        text: {
          en: `${name} booked ${r.unit} ${via.en} for ${stayRange('en', r.checkIn, r.checkOut)}. Close those nights on Airbnb and Booking.com.`,
          ar: `${name} حجز ${r.unit} ${via.ar} من ${stayRange('ar', r.checkIn, r.checkOut)}. اقفل الليالي دي على Airbnb و${nb}Booking.com.`,
        },
      };
    });
  // Cleans start after the noon check-out, so their "ready" notes only exist from early afternoon.
  const cairoHour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', hourCycle: 'h23' }).format(now));
  const firstReady = Date.parse(`${today}T12:40:00+02:00`);
  const cleans = (cairoHour < 13 ? [] : tasks)
    .filter((t) => t.type === 'turnover' && t.date === today && t.status === 'done')
    .map((t, i): TeamAlert => {
      const person = staff.find((s) => s.id === t.staffId);
      const planned = firstReady + i * 37 * 60_000;
      return {
        id: `a-${t.id}`,
        at: new Date(Math.min(planned, now.getTime() - (5 + i * 9) * 60_000)).toISOString(),
        kind: 'task',
        text: {
          en: `${t.unit} is clean and ready. ${person?.name.en ?? 'Housekeeping'} sent the photos.`,
          ar: `${t.unit} نضيفة وجاهزة. ${person?.name.ar ?? 'النضافة'} بعتت الصور.`,
        },
      };
    });
  return [...direct, ...cleans];
}

export function buildDemo(today: string, now: Date): DemoData {
  const regulars = buildGuests();
  const { reservations, newGuests } = buildStays(today, regulars);
  const guests = [...regulars, ...newGuests];
  const blocks = buildBlocks(today);
  clearBlocks(blocks, reservations);
  addOpeningClash(today, reservations);
  addSameDayTurnover(today, reservations, blocks);
  const tasks = buildTasks(today, reservations);
  const alerts: TeamAlert[] = [
    {
      id: 'a-0',
      at: `${addDays(today, -1)}T22:48:00+02:00`,
      kind: 'clash' as const,
      text: {
        en: 'Clash on GN-ATM-009: a Booking.com booking overlaps a WhatsApp booking. Fix before confirming.',
        ar: 'تعارض على GN-ATM-009: حجز Booking.com متداخل مع حجز واتساب. صلّحه قبل التأكيد.',
      },
    },
    ...teamMessages(today, now, reservations, guests, tasks),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));
  return {
    today,
    now: now.toISOString(),
    units,
    owners,
    guests,
    reservations,
    blocks,
    staff,
    tasks,
    leads: buildLeads(today),
    feeds: buildFeeds(now),
    alerts,
    payouts: buildPayouts(today),
  };
}
