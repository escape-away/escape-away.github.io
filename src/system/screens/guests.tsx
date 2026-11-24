'use client';

import { CalendarPlus, Search, Star } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { common, nav, useCopy, useLang } from '../copy';
import { count, guestsCount, money, num, stayRange } from '../format';
import { live, valueOf } from '../select';
import { useData, useDemo } from '../store';
import type { Guest, Lang, Reservation } from '../types';
import { Code, Empty, PageHead, Panel } from '../ui/bits';

/** The word forms format.ts's count() takes for each language. */
type Forms = { one: string; other: string; two?: string; few?: string; many?: string };

const en = {
  sub: (guests: string, returning: string) => `${guests} with a booking, ${returning} · sample data`,
  returningForms: { one: '# returning', other: '# returning' } as Forms,
  filter: 'Filter by name or phone',
  filterLabel: 'Filter guests',
  guest: 'Guest',
  phone: 'Phone',
  language: 'Language',
  stays: 'Stays',
  stay: 'Next or last stay',
  total: 'Total spent',
  totals: 'Totals include upcoming stays',
  languages: { ar: 'Arabic', en: 'English' } as Record<Lang, string>,
  returning: 'Returning guest',
  // No-break spaces: each label stays on one line when a narrow column wraps.
  now: 'Staying now',
  next: 'Next stay',
  last: 'Last stay',
  showAll: 'Show every guest',
  more: (n: number) => `Show ${n} more`,
};

const ar: typeof en = {
  sub: (guests, returning) => `${guests} عندهم حجز، منهم ${returning} · بيانات تجريبية`,
  returningForms: { one: 'واحد بيرجع تاني', two: 'اتنين بيرجعوا تاني', few: '# بيرجعوا تاني', many: '# بيرجعوا تاني', other: '# بيرجعوا تاني' },
  filter: 'دوّر بالاسم أو رقم التليفون',
  filterLabel: 'دوّر على ضيف',
  guest: 'الضيف',
  phone: 'التليفون',
  language: 'اللغة',
  stays: 'الإقامات',
  stay: 'الإقامة',
  total: 'إجمالي الإنفاق',
  totals: 'الإجمالي بيشمل الإقامات الجاية',
  languages: { ar: 'العربية', en: 'الإنجليزية' },
  returning: 'ضيف متكرر',
  now: 'مقيم دلوقتي',
  next: 'الإقامة الجاية',
  last: 'آخر إقامة',
  showAll: 'اعرض كل الضيوف',
  more: (n: number) => `اعرض ${n} كمان`,
};

const copy = { en, ar };

type Row = {
  guest: Guest;
  stays: number;
  total: number;
  returning: boolean;
  /** The stay the row shows and opens: the current or next one, else the latest. */
  stay: Reservation;
  when: 'now' | 'next' | 'last';
};

/** Lower case, Western digits, and one spelling for the Arabic letters people type either way. */
function fold(text: string) {
  return text
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

/** Rows open their side panel from the keyboard too. */
function onRowKey(e: KeyboardEvent<HTMLTableRowElement>, open: () => void) {
  if (e.target !== e.currentTarget) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    open();
  }
}

const byCheckIn = (a: Reservation, b: Reservation) => (a.checkIn < b.checkIn ? -1 : a.checkIn > b.checkIn ? 1 : 0);
const PAGE = 60;

export function GuestsScreen() {
  const lang = useLang();
  const t = useCopy(copy);
  const c = useCopy(common);
  const data = useData();
  const { panel, setPanel } = useDemo();
  const [query, setQuery] = useState('');
  // Long lists show a page at a time, so the table stays quick on a phone.
  const [limit, setLimit] = useState(PAGE);

  // Everyone with at least one booking that isn't cancelled; guests with a stay ahead come first, soonest first.
  const rows = useMemo(() => {
    const byGuest = new Map<string, Reservation[]>();
    for (const r of live(data)) {
      if (!r.guestId) continue;
      const list = byGuest.get(r.guestId);
      if (list) list.push(r);
      else byGuest.set(r.guestId, [r]);
    }
    const out: Row[] = [];
    for (const guest of data.guests) {
      const list = byGuest.get(guest.id);
      if (!list) continue;
      list.sort(byCheckIn);
      const ahead = list.find((r) => r.checkOut > data.today);
      const stay = ahead ?? list[list.length - 1];
      out.push({
        guest,
        stays: list.length + guest.pastStays,
        total: list.reduce((sum, r) => sum + valueOf(r), 0),
        returning: guest.pastStays > 0 || list.length > 1,
        stay,
        when: !ahead ? 'last' : ahead.status === 'checked-in' || ahead.checkIn < data.today ? 'now' : 'next',
      });
    }
    return out.sort((a, b) => {
      const aAhead = a.when !== 'last';
      const bAhead = b.when !== 'last';
      if (aAhead !== bAhead) return aAhead ? -1 : 1;
      return aAhead ? byCheckIn(a.stay, b.stay) : b.stay.checkOut < a.stay.checkOut ? -1 : b.stay.checkOut > a.stay.checkOut ? 1 : 0;
    });
  }, [data]);

  const shown = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return rows;
    const digits = q.replace(/\D/g, '');
    // An Egyptian number typed the local way (010…) also finds it written +20 10…
    const local = digits.startsWith('0') ? `20${digits.slice(1)}` : null;
    return rows.filter(({ guest }) => {
      if (fold(guest.name).includes(q)) return true;
      if (digits.length < 3) return false;
      const phone = guest.phone.replace(/\D/g, '');
      return phone.includes(digits) || (local !== null && phone.includes(local));
    });
  }, [rows, query]);

  const regions = useMemo(() => new Intl.DisplayNames([lang === 'ar' ? 'ar-EG' : 'en'], { type: 'region' }), [lang]);
  const country = (code: string) => {
    try {
      return regions.of(code) ?? code;
    } catch {
      return code;
    }
  };

  const returningCount = rows.filter((r) => r.returning).length;
  const openGuest = panel?.kind === 'reservation' ? data.reservations.find((r) => r.id === panel.id)?.guestId : undefined;
  const open = (row: Row) => setPanel({ kind: 'reservation', id: row.stay.id });

  return (
    <>
      <PageHead
        title={nav.guests[lang]}
        sub={t.sub(guestsCount(lang, rows.length), count(lang, returningCount, en.returningForms, ar.returningForms))}
        phase="core"
        actions={
          <button type="button" className="sys-btn sys-btn--primary" onClick={() => setPanel({ kind: 'new' })}>
            <CalendarPlus size={17} strokeWidth={1.75} aria-hidden="true" />
            {c.newBooking}
          </button>
        }
      />

      <div className="sys-toolbar">
        <label className="sys-filter grow">
          <Search size={16} strokeWidth={1.75} aria-hidden="true" />
          <input
            className="sys-input"
            type="search"
            placeholder={t.filter}
            aria-label={t.filterLabel}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
          />
        </label>
      </div>

      <Panel title={guestsCount(lang, shown.length)} meta={t.totals} flush>
        {shown.length ? (
          <div className="sys-table-wrap">
            <table className="sys-table" aria-label={nav.guests[lang]}>
              <thead>
                <tr>
                  <th scope="col">{t.guest}</th>
                  <th scope="col" className="hide-narrow">
                    {t.phone}
                  </th>
                  <th scope="col" className="hide-medium">
                    {t.language}
                  </th>
                  <th scope="col" className="end hide-medium">
                    {t.stays}
                  </th>
                  <th scope="col">{t.stay}</th>
                  <th scope="col" className="end hide-narrow">
                    {t.total}
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, limit).map((row) => (
                  <tr
                    key={row.guest.id}
                    tabIndex={0}
                    aria-selected={openGuest === row.guest.id}
                    onClick={() => open(row)}
                    onKeyDown={(e) => onRowKey(e, () => open(row))}
                  >
                    <td className="wrap">
                      <span className="who">
                        <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <bdi>{row.guest.name}</bdi>
                          {row.returning ? (
                            <Star
                              size={16}
                              strokeWidth={1.75}
                              color="var(--ea-gold)"
                              fill="var(--ea-gold)"
                              role="img"
                              aria-label={t.returning}
                              style={{ flex: 'none' }}
                            >
                              <title>{t.returning}</title>
                            </Star>
                          ) : null}
                        </b>
                        <span>{country(row.guest.country)}</span>
                      </span>
                    </td>
                    <td className="hide-narrow">
                      <span className="ltr">{row.guest.phone}</span>
                    </td>
                    <td className="hide-medium">{t.languages[row.guest.language]}</td>
                    <td className="end hide-medium">{num(lang, row.stays)}</td>
                    {/* Wraps, so a stay across New Year ("Dec 31, 2026 – Jan 6, 2027") never widens a phone's table. */}
                    <td className="wrap">
                      <span className="who">
                        <b>
                          <time dateTime={row.stay.checkIn}>{stayRange(lang, row.stay.checkIn, row.stay.checkOut)}</time>
                        </b>
                        {/* The code leads its line, so a narrow column breaks after it rather than inside it. */}
                        <span>
                          <Code>{row.stay.unit}</Code> · {t[row.when]}
                        </span>
                      </span>
                    </td>
                    <td className="end hide-narrow">{money(lang, row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length > limit ? (
              <div className="sys-panel__foot">
                <button type="button" className="sys-btn sys-btn--quiet" onClick={() => setLimit(limit + PAGE)}>
                  {t.more(Math.min(PAGE, shown.length - limit))}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <Empty title={c.noResults}>
            <button type="button" className="sys-btn sys-btn--secondary sys-btn--small" onClick={() => setQuery('')}>
              {t.showAll}
            </button>
          </Empty>
        )}
      </Panel>
    </>
  );
}
