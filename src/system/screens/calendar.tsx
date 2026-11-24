'use client';

import { CalendarPlus, ChevronLeft, ChevronRight, Search, TriangleAlert, CircleDashed } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { areaById, areas, compoundByCode } from '../catalog';
import { blockLabel, channelLabel, channelTag, common, statusLabel, useCopy, useLang } from '../copy';
import { addDays, diffDays, eachDay, isWeekend } from '../dates';
import { day, homesCount, nights as nightsText, pct, stayRange } from '../format';
import { clashes, live, performance } from '../select';
import { useData, useDemo } from '../store';
import type { AreaId, Channel, Reservation, Unit } from '../types';
import { Code, PageHead } from '../ui/bits';

const DAYS = 35;

const copy = {
  en: {
    title: 'Calendar',
    sub: 'Every home on one timetable. Click a stay to open it, or an empty night to book it. Sample data.',
    newBooking: 'New booking',
    today: 'Today',
    earlier: 'Earlier',
    later: 'Later',
    all: 'All areas',
    filter: 'Filter homes',
    homes: 'Homes',
    clash: (unit: string, range: string) => (
      <>
        Two bookings overlap on <Code>{unit}</Code> ({range}). Fix before confirming.
      </>
    ),
    review: 'Review',
    booked: 'booked',
    none: 'No homes match that filter.',
    legend: {
      confirmed: 'Confirmed',
      pending: 'Waiting for payment',
      inStay: 'In stay',
      past: 'Checked out',
      blocked: 'Owner stay or maintenance',
      clash: 'Clash',
    },
    missing: 'needs details',
    noName: 'No name yet',
    attention: 'Needs attention',
    clashes: (n: number) => (n === 1 ? '1 clash' : `${n} clashes`),
  },
  ar: {
    title: 'التقويم',
    sub: 'كل الوحدات في جدول واحد. دوس على إقامة تفتحها، أو على ليلة فاضية تحجزها. بيانات تجريبية.',
    newBooking: 'حجز جديد',
    today: 'النهاردة',
    earlier: 'قبل كده',
    later: 'بعد كده',
    all: 'كل المناطق',
    filter: 'دوّر على وحدة',
    homes: 'الوحدات',
    clash: (unit: string, range: string) => (
      <>
        حجزين متداخلين على <Code>{unit}</Code> ({range}). صلّحه قبل التأكيد.
      </>
    ),
    review: 'راجع',
    booked: 'محجوز',
    none: 'مفيش وحدات بالبحث ده.',
    legend: {
      confirmed: 'مؤكد',
      pending: 'في انتظار الدفع',
      inStay: 'مقيم',
      past: 'غادر',
      blocked: 'إقامة المالك أو صيانة',
      clash: 'تعارض',
    },
    missing: 'ناقص البيانات',
    noName: 'من غير اسم',
    attention: 'محتاج اهتمام',
    clashes: (n: number) => (n === 1 ? 'تعارض واحد' : n === 2 ? 'تعارضين' : `${n} تعارضات`),
  },
};

/**
 * What fits in a two-night bar: a Latin name's initials ("S. L."), or an Arabic name's first word
 * (Arabic initials read oddly). The full name stays in the bar's tooltip and label.
 */
function initials(name: string) {
  const words = name.trim().split(/\s+/);
  if (/[؀-ۿ]/.test(name)) return words[0];
  return words.length > 1 ? `${words[0][0]}. ${words[words.length - 1][0]}.` : words[0].slice(0, 6);
}

const tone = (r: Reservation) =>
  r.status === 'pending' ? 'warn' : r.status === 'checked-in' ? 'info' : r.status === 'checked-out' ? 'done' : 'ok';

/** Where a stretch of nights sits in the visible window, in day widths from the first column. */
function place(from: string, to: string, start: string) {
  const end = addDays(start, DAYS);
  if (to <= start || from >= end) return null;
  const cutStart = from < start;
  const cutEnd = to > end;
  const a = cutStart ? 0 : diffDays(start, from) + 0.5;
  const b = cutEnd ? DAYS : diffDays(start, to) + 0.5;
  return { a, width: b - a, cutStart, cutEnd };
}

export function CalendarScreen() {
  const lang = useLang();
  const t = useCopy(copy);
  const c = useCopy(common);
  const data = useData();
  const { setPanel, focus, setFocus } = useDemo();
  const [start, setStart] = useState(() => addDays(data.today, -3));
  const [area, setArea] = useState<AreaId | 'all'>('all');
  const [query, setQuery] = useState('');
  const scroller = useRef<HTMLDivElement>(null);

  const days = useMemo(() => eachDay(start, DAYS), [start]);
  const end = addDays(start, DAYS);
  const allClashes = useMemo(() => clashes(data), [data]);
  const clashSet = useMemo(() => new Set(allClashes.flatMap((x) => x.ids)), [allClashes]);
  const clashUnits = useMemo(() => new Set(allClashes.map((x) => x.unit)), [allClashes]);

  // A booking to point at: bring its nights into view, then ring it.
  const focused = focus ? data.reservations.find((r) => r.id === focus) : undefined;
  useEffect(() => {
    if (!focused) return;
    if (focused.checkIn < start || focused.checkIn >= addDays(start, DAYS - 4)) setStart(addDays(focused.checkIn, -4));
    if (area !== 'all' && areaById[area] && data.units.find((u) => u.code === focused.unit)?.area !== area) setArea('all');
    const timer = window.setTimeout(() => setFocus(null), 4200);
    return () => window.clearTimeout(timer);
    // Only when a new booking is pointed at.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);
  useEffect(() => {
    if (!focused) return;
    const el = scroller.current?.querySelector<HTMLElement>(`[data-res="${focused.id}"]`);
    el?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  }, [focused, start, area]);

  const stays = useMemo(() => {
    const byUnit = new Map<string, Reservation[]>();
    for (const r of live(data)) {
      if (r.checkOut <= start || r.checkIn >= end) continue;
      const list = byUnit.get(r.unit) ?? [];
      list.push(r);
      byUnit.set(r.unit, list);
    }
    return byUnit;
  }, [data, start, end]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (u: Unit) =>
      !q ||
      u.code.toLowerCase().includes(q) ||
      u.name.en.toLowerCase().includes(q) ||
      u.name.ar.includes(query.trim()) ||
      compoundByCode[u.compound].name.en.toLowerCase().includes(q) ||
      compoundByCode[u.compound].name.ar.includes(query.trim());
    const byArea = areas
      .filter((a) => area === 'all' || a.id === area)
      .map((a) => {
        const units = data.units.filter((u) => u.area === a.id && matches(u));
        const perf = performance(data, start, end, new Set(units.map((u) => u.code)));
        return { key: a.id as string, label: a.name[lang], units, note: `${pct(lang, perf.occupancy)} ${t.booked}`, attention: false };
      })
      .filter((g) => g.units.length);
    // Homes with a clash also sit on top, so the calendar opens on what needs fixing.
    const flagged = data.units.filter((u) => clashUnits.has(u.code) && (area === 'all' || u.area === area) && matches(u));
    return flagged.length
      ? [{ key: 'attention', label: t.attention, units: flagged, note: t.clashes(allClashes.length), attention: true }, ...byArea]
      : byArea;
  }, [data, area, query, start, end, lang, t, clashUnits, allClashes.length]);

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: data.units.length };
    for (const u of data.units) out[u.area] = (out[u.area] ?? 0) + 1;
    return out;
  }, [data.units]);

  const guests = useMemo(() => new Map(data.guests.map((g) => [g.id, g])), [data.guests]);
  const todayIndex = diffDays(start, data.today);
  const gridStyle = { '--tt-days': DAYS } as CSSProperties;

  return (
    <>
      <PageHead
        title={t.title}
        sub={t.sub}
        phase="core"
        actions={
          <button type="button" className="sys-btn sys-btn--primary" onClick={() => setPanel({ kind: 'new' })}>
            <CalendarPlus size={17} strokeWidth={1.75} aria-hidden="true" />
            {t.newBooking}
          </button>
        }
      />

      {allClashes.length ? (
        <div className="sys-alerts">
          {allClashes.map((cl) => (
            <div key={cl.ids.join()} className="sys-alert" role="alert">
              <TriangleAlert size={18} strokeWidth={1.75} aria-hidden="true" />
              <p className="sys-alert__text">{t.clash(cl.unit, stayRange(lang, cl.from, cl.to))}</p>
              <button
                type="button"
                className="sys-btn sys-btn--secondary sys-btn--small"
                onClick={() => {
                  setPanel({ kind: 'reservation', id: cl.ids[1] });
                  setFocus(cl.ids[1]);
                }}
              >
                {t.review}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="sys-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button type="button" className="sys-btn sys-btn--quiet sys-btn--icon" aria-label={t.earlier} onClick={() => setStart(addDays(start, -7))}>
            <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" className="flip-rtl" />
          </button>
          <button type="button" className="sys-btn sys-btn--secondary sys-btn--small" onClick={() => setStart(addDays(data.today, -3))}>
            {t.today}
          </button>
          <button type="button" className="sys-btn sys-btn--quiet sys-btn--icon" aria-label={t.later} onClick={() => setStart(addDays(start, 7))}>
            <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" className="flip-rtl" />
          </button>
          <span className="sys-small" style={{ fontWeight: 500 }}>
            <time>{stayRange(lang, start, addDays(end, -1))}</time>
          </span>
        </div>
        <div className="sys-segment" role="group" aria-label={t.all}>
          <button type="button" aria-pressed={area === 'all'} onClick={() => setArea('all')}>
            {t.all}
            <span className="n">{counts.all}</span>
          </button>
          {areas.map((a) => (
            <button key={a.id} type="button" aria-pressed={area === a.id} onClick={() => setArea(a.id)}>
              {a.name[lang]}
              <span className="n">{counts[a.id]}</span>
            </button>
          ))}
        </div>
        <label className="sys-filter grow">
          <Search size={16} strokeWidth={1.75} aria-hidden="true" />
          <input className="sys-input" type="search" placeholder={t.filter} aria-label={t.filter} value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      <div className="tt" ref={scroller} style={gridStyle} role="region" aria-label={t.title} tabIndex={0}>
        <div className="tt__grid">
          <div className="tt__head">
            <div className="tt__corner">
              {homesCount(lang, groups.reduce((n, g) => n + (g.attention ? 0 : g.units.length), 0))}
            </div>
            {days.map((d, i) => {
              const first = d.endsWith('-01') || i === 0;
              return (
                <div
                  key={d}
                  className={`tt__day${isWeekend(d) ? ' is-weekend' : ''}${i === todayIndex ? ' is-today' : ''}${d.endsWith('-01') ? ' is-month' : ''}`}
                  title={day(lang, d, { weekday: 'long', day: 'numeric', month: 'long' })}
                >
                  <span>{first ? day(lang, d, { month: 'short' }) : day(lang, d, { weekday: 'narrow' })}</span>
                  <b>{day(lang, d, { day: 'numeric' })}</b>
                </div>
              );
            })}
          </div>

          {groups.length ? (
            groups.map((g) => (
              <div key={g.key}>
                <div className={`tt__area${g.attention ? ' is-attention' : ''}`}>
                  <span className="tt__area-label">
                    {g.attention ? <TriangleAlert size={15} strokeWidth={2} aria-hidden="true" /> : null}
                    <b>{g.label}</b>
                    <span>{homesCount(lang, g.units.length)}</span>
                    <span>{g.note}</span>
                  </span>
                </div>
                {g.units.map((u) => {
                  const list = [...(stays.get(u.code) ?? [])].sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1));
                  const blocks = data.blocks.filter((b) => b.unit === u.code);
                  // Clashing stays share nights: give each its own line in the row so neither hides the other.
                  const lanes = new Map<string, number>();
                  const laneEnds: string[] = [];
                  for (const r of list) {
                    let lane = laneEnds.findIndex((endsOn) => endsOn <= r.checkIn);
                    if (lane === -1) lane = laneEnds.length;
                    laneEnds[lane] = r.checkOut;
                    lanes.set(r.id, lane);
                  }
                  return (
                    <div key={u.code} className={`tt__row${clashUnits.has(u.code) ? ' is-clash' : ''}`}>
                      <button type="button" className="tt__unit" onClick={() => setPanel({ kind: 'unit', code: u.code })}>
                        <b className="sys-code">{u.code}</b>
                        <span>{u.name[lang]}</span>
                      </button>
                      {days.map((d, i) => (
                        <div
                          key={d}
                          aria-hidden="true"
                          className={`tt__cell${isWeekend(d) ? ' is-weekend' : ''}${i === todayIndex ? ' is-today' : ''}`}
                          onClick={() => (d >= data.today ? setPanel({ kind: 'new', unit: u.code, checkIn: d }) : undefined)}
                        />
                      ))}
                      {blocks.map((b) => {
                        const p = place(b.start, b.end, start);
                        if (!p) return null;
                        return (
                          <div
                            key={b.id}
                            className="tt__block"
                            style={{
                              insetInlineStart: `calc(var(--tt-unit) + ${p.a} * var(--tt-day) + 2px)`,
                              inlineSize: `calc(${p.width} * var(--tt-day) - 4px)`,
                            }}
                            title={`${blockLabel[b.reason][lang]} · ${stayRange(lang, b.start, b.end)}`}
                          >
                            {blockLabel[b.reason][lang]}
                          </div>
                        );
                      })}
                      {list.map((r) => {
                        const p = place(r.checkIn, r.checkOut, start);
                        if (!p) return null;
                        const guest = r.guestId ? guests.get(r.guestId) : undefined;
                        const inClash = clashSet.has(r.id);
                        const label = guest ? guest.name : `${channelLabel[r.channel].en} · ${t.missing}`;
                        // A short stay never shows a two-letter stub of a name: one night shows the
                        // channel tag only, two nights the guest's initials; the full name is in the tooltip.
                        // The red outline already says "clash" and a missing name is said in words, so the
                        // bar spends its width on the name; an icon stands in only where words don't fit.
                        const size = p.width < 1.6 ? 'tiny' : p.width < 2.6 ? 'short' : 'full';
                        const shown =
                          size === 'tiny' ? '' : guest ? (size === 'short' ? initials(guest.name) : guest.name) : size === 'full' ? t.noName : '';
                        const flag =
                          size === 'short' && !guest ? <CircleDashed size={13} strokeWidth={2} className="flag" aria-hidden="true" /> : null;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            data-res={r.id}
                            data-tone={tone(r)}
                            className={`tt__bar${p.cutStart ? ' is-cut-start' : ''}${p.cutEnd ? ' is-cut-end' : ''}${inClash ? ` is-clash is-lane-${Math.min(1, lanes.get(r.id) ?? 0)}` : ''}${focus === r.id ? ' is-focus' : ''}`}
                            style={{
                              insetInlineStart: `calc(var(--tt-unit) + ${p.a} * var(--tt-day) + 2px)`,
                              inlineSize: `calc(${p.width} * var(--tt-day) - 4px)`,
                            }}
                            aria-label={`${label}, ${channelLabel[r.channel][lang]}, ${stayRange(lang, r.checkIn, r.checkOut)}, ${nightsText(lang, diffDays(r.checkIn, r.checkOut))}, ${statusLabel[r.status][lang]}${inClash ? `, ${c.clash}` : ''}`}
                            title={`${label} · ${channelLabel[r.channel][lang]} · ${stayRange(lang, r.checkIn, r.checkOut)}`}
                            onClick={() => setPanel({ kind: 'reservation', id: r.id })}
                          >
                            <span className="tag" lang="en">
                              {channelTag[r.channel]}
                            </span>
                            {flag}
                            {shown ? (
                              // Its own direction, so a Latin name in an Arabic row is cut at its end, not its start.
                              <span className="name" dir="auto">
                                {shown}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="sys-empty">
              <b>{t.none}</b>
            </div>
          )}
        </div>
      </div>

      <div className="tt__legend">
        <span>
          <i className="ok" />
          {t.legend.confirmed}
        </span>
        <span>
          <i className="warn" />
          {t.legend.pending}
        </span>
        <span>
          <i className="info" />
          {t.legend.inStay}
        </span>
        <span>
          <i className="done" />
          {t.legend.past}
        </span>
        <span>
          <i className="block" />
          {t.legend.blocked}
        </span>
        <span>
          <i className="clash" />
          {t.legend.clash}
        </span>
        {/* Each code beside its name, as one isolated pair, so Arabic never pairs a code with the wrong name. */}
        <span className="tt__tags">
          {(Object.keys(channelTag) as Channel[]).map((ch) => (
            <span key={ch} className="tt__tag-pair">
              <span className="tag" lang="en">
                {channelTag[ch]}
              </span>
              <bdi>{channelLabel[ch][lang]}</bdi>
            </span>
          ))}
        </span>
      </div>
    </>
  );
}
