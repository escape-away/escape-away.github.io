'use client';

import '@/styles/system-finance.css';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { areas } from '../catalog';
import { channelLabel, nav, useCopy, useLang } from '../copy';
import { addDays, addMonths, monthOf, monthStart } from '../dates';
import { compact, count, day, money, moneyShort, monthName, num, pct, stayRange } from '../format';
import { performance, revenueByChannel } from '../select';
import { useData, useDemo } from '../store';
import type { AreaId, Channel } from '../types';
import { Code, Empty, PageHead, Panel } from '../ui/bits';

/** The word forms format.ts's count() takes for each language. */
type Forms = { one: string; other: string; two?: string; few?: string; many?: string };
type PeriodKey = 'days' | 'month' | 'half';
type AreaKey = AreaId | 'all';
/** A season sentence: the peak share and its month, then the low share and its month. */
type Season = (peak: string, peakMonth: string, low: string, lowMonth: string) => string;

const en = {
  sub: 'Occupancy, rates and revenue across every home · sample data',
  periodGroup: 'Period',
  periods: { days: 'Last 30 days', month: 'This month', half: 'Last 6 months' } as Record<PeriodKey, string>,
  occupancy: 'Occupancy',
  adr: 'Average nightly rate (ADR)',
  revpar: 'Revenue per available night (RevPAR)',
  revenue: 'Room revenue',
  revenueFigure: 'Room revenue, EGP',
  up: (amount: string, than: string) => `Up ${amount} on ${than}`,
  down: (amount: string, than: string) => `Down ${amount} on ${than}`,
  level: (than: string) => `Level with ${than}`,
  daysBefore: 'the 30 days before',
  pointForms: { one: '# point', other: '# points' } as Forms,
  byMonth: 'Occupancy by month',
  areaGroup: 'Area',
  allAreas: 'All areas',
  chartLabel: (area: string, values: string) => `Occupancy by month, ${area}: ${values}`,
  listSep: ', ',
  season: {
    all: (p, pm, l, lm) => `Across all homes, the coast’s summer and Gouna’s winter take turns at the top (${p} in ${pm}, ${l} in ${lm}).`,
    'north-coast': (p, pm, l, lm) => `The North Coast lives on summer: full in July and August, near empty in winter (${p} in ${pm}, ${l} in ${lm}).`,
    'el-alamein': (p, pm, l, lm) => `El Alamein follows the North Coast: full in July and August, quiet in winter (${p} in ${pm}, ${l} in ${lm}).`,
    gouna: (p, pm, l, lm) => `Gouna runs the other way: busiest in winter, quietest in the summer heat (${p} in ${pm}, ${l} in ${lm}).`,
    cairo: (p, _pm, l) => `Cairo stays steady all year, a little busier in the cooler months (between ${l} and ${p} a month).`,
    'sheikh-zayed': (p, _pm, l) => `Sheikh Zayed is just as steady, a little busier in the cooler months (between ${l} and ${p} a month).`,
  } as Record<AreaKey, Season>,
  nowNote: (month: string) => `${month} counts the nights booked so far, to the end of the month.`,
  byChannel: 'Revenue by channel',
  direct: (share: string) => `Direct bookings from the website, WhatsApp and phone brought in ${share} of room revenue, and cost only Paymob’s card fee.`,
  noRevenue: 'No room revenue in this period.',
  byArea: 'By area',
  area: 'Area',
  homes: 'Homes',
  adrShort: 'ADR',
  best: 'Best earners',
  bestMeta: 'Top 5 by revenue',
  quiet: 'Quietest homes',
  quietMeta: 'Bottom 5 by revenue',
  home: 'Home',
};

const ar: typeof en = {
  sub: 'الإشغال والأسعار والإيراد لكل الوحدات · بيانات تجريبية',
  periodGroup: 'الفترة',
  periods: { days: 'آخر 30 يوم', month: 'الشهر ده', half: 'آخر 6 شهور' },
  occupancy: 'نسبة الإشغال',
  adr: 'متوسط سعر الليلة (ADR)',
  revpar: 'الإيراد لكل ليلة متاحة (RevPAR)',
  revenue: 'إيراد الإقامات',
  revenueFigure: 'إيراد الإقامات، ج.م',
  up: (amount, than) => `ارتفاع ${amount} عن ${than}`,
  down: (amount, than) => `انخفاض ${amount} عن ${than}`,
  level: (than) => `نفس مستوى ${than}`,
  daysBefore: 'الثلاثين يومًا السابقة',
  pointForms: { one: 'نقطة واحدة', two: 'نقطتين', few: '# نقاط', many: '# نقطة', other: '# نقطة' },
  byMonth: 'الإشغال شهرًا بشهر',
  areaGroup: 'المنطقة',
  allAreas: 'كل المناطق',
  chartLabel: (area, values) => `الإشغال شهرًا بشهر، ${area}: ${values}`,
  listSep: '، ',
  season: {
    all: (p, pm, l, lm) => `على مستوى كل الوحدات، يتناوب صيف الساحل وشتاء الجونة على أعلى إشغال (${p} في ${pm} و${l} في ${lm}).`,
    'north-coast': (p, pm, l, lm) => `الساحل الشمالي يعيش على الصيف: ممتلئ في يوليو وأغسطس وشبه فارغ في الشتاء (${p} في ${pm} و${l} في ${lm}).`,
    'el-alamein': (p, pm, l, lm) => `العلمين تسير على نمط الساحل الشمالي: ممتلئة في يوليو وأغسطس وهادئة في الشتاء (${p} في ${pm} و${l} في ${lm}).`,
    gouna: (p, pm, l, lm) => `الجونة على عكس الساحل: أعلى إشغال في الشتاء وأهدأ وقت في حر الصيف (${p} في ${pm} و${l} في ${lm}).`,
    cairo: (p, _pm, l) => `القاهرة ثابتة طوال السنة، وتزيد قليلًا في الشهور الأبرد (بين ${l} و${p} في الشهر).`,
    'sheikh-zayed': (p, _pm, l) => `الشيخ زايد ثابت بالقدر نفسه، ويزيد قليلًا في الشهور الأبرد (بين ${l} و${p} في الشهر).`,
  },
  nowNote: (month) => `${month} يشمل الليالي المحجوزة حتى الآن، إلى آخر الشهر.`,
  byChannel: 'الإيراد حسب القناة',
  direct: (share) => `الحجوزات المباشرة من الموقع وواتساب والتليفون جلبت ${share} من إيراد الإقامات، وتكلفتها الوحيدة رسوم الدفع عبر Paymob.`,
  noRevenue: 'لا يوجد إيراد إقامات في هذه الفترة.',
  byArea: 'حسب المنطقة',
  area: 'المنطقة',
  homes: 'الوحدات',
  adrShort: 'متوسط الليلة',
  best: 'الأعلى إيرادًا',
  bestMeta: 'أعلى 5 في الإيراد',
  quiet: 'الأهدأ',
  quietMeta: 'أقل 5 في الإيراد',
  home: 'الوحدة',
};

const copy = { en, ar };

const periodKeys: PeriodKey[] = ['days', 'month', 'half'];
const channels: Channel[] = ['airbnb', 'booking', 'direct', 'whatsapp', 'phone'];

/** Height of a 100% column in the occupancy chart: the room .sys-cols leaves under each column's label. */
const COLUMN_REM = 8.5;

/** [from, to) for each period, and the stretch before it to compare with (the sample starts five months back). */
function periodOf(key: PeriodKey, today: string) {
  const month = monthOf(today);
  if (key === 'days') {
    return { from: addDays(today, -30), to: today, before: { from: addDays(today, -60), to: addDays(today, -30) } };
  }
  if (key === 'month') {
    return { from: monthStart(month), to: monthStart(addMonths(month, 1)), before: { from: monthStart(addMonths(month, -1)), to: monthStart(month) } };
  }
  return { from: monthStart(addMonths(month, -5)), to: monthStart(addMonths(month, 1)), before: null };
}

/** Rows open from the keyboard too. */
function onRowKey(e: KeyboardEvent<HTMLTableRowElement>, open: () => void) {
  if (e.target !== e.currentTarget) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    open();
  }
}

type Delta = { dir: 'up' | 'down' | 'level'; text: string } | null;

function DeltaLine({ delta }: { delta: Delta }) {
  if (!delta) return null;
  const Icon = delta.dir === 'up' ? ArrowUp : delta.dir === 'down' ? ArrowDown : null;
  const tone = delta.dir === 'up' ? 'is-up' : delta.dir === 'down' ? 'is-down' : 'sys-muted';
  return (
    <span className={`sys-delta fin-delta ${tone}`}>
      {Icon ? <Icon size={16} strokeWidth={1.75} aria-hidden="true" /> : null}
      {delta.text}
    </span>
  );
}

export function ReportsScreen() {
  const lang = useLang();
  const t = useCopy(copy);
  const data = useData();
  const { panel, setPanel } = useDemo();
  const [period, setPeriod] = useState<PeriodKey>('days');
  const [area, setArea] = useState<AreaKey>('all');
  const thisMonth = monthOf(data.today);
  const { from, to, before } = useMemo(() => periodOf(period, data.today), [period, data.today]);
  const openCode = panel?.kind === 'unit' ? panel.code : null;

  const report = useMemo(() => {
    const now = performance(data, from, to);
    const then = before ? performance(data, before.from, before.to) : null;
    const byChannel = revenueByChannel(data, from, to);
    const channelTotal = channels.reduce((s, ch) => s + byChannel[ch], 0);
    const byArea = areas.map((a) => {
      const set = new Set(data.units.filter((u) => u.area === a.id).map((u) => u.code));
      return { area: a, homes: set.size, perf: performance(data, from, to, set) };
    });
    const ranked = data.units.map((unit) => ({ unit, perf: performance(data, from, to, new Set([unit.code])) }));
    const byCode = (a: (typeof ranked)[number], b: (typeof ranked)[number]) => (a.unit.code < b.unit.code ? -1 : 1);
    const best = [...ranked].sort((a, b) => b.perf.revenue - a.perf.revenue || byCode(a, b)).slice(0, 5);
    const quiet = [...ranked].sort((a, b) => a.perf.revenue - b.perf.revenue || byCode(a, b)).slice(0, 5);
    return { now, then, byChannel, channelTotal, byArea, best, quiet };
  }, [data, from, to, before]);

  // The chart always shows the six months the sample covers, this one last; the area choice filters it.
  const series = useMemo(() => {
    const set = area === 'all' ? undefined : new Set(data.units.filter((u) => u.area === area).map((u) => u.code));
    return Array.from({ length: 6 }, (_, i) => {
      const m = addMonths(thisMonth, i - 5);
      return { m, occ: performance(data, monthStart(m), monthStart(addMonths(m, 1)), set).occupancy };
    });
  }, [data, area, thisMonth]);

  const than = period === 'days' ? t.daysBefore : period === 'month' ? monthName(lang, addMonths(thisMonth, -1), false) : null;

  /** The change against the stretch before: points for occupancy, a share of the old value for money. */
  const change = (now: number, then: number | undefined, points: boolean): Delta => {
    if (!than || then === undefined) return null;
    if (points) {
      const d = Math.round((now - then) * 100);
      if (!d) return { dir: 'level', text: t.level(than) };
      const amount = count(lang, Math.abs(d), en.pointForms, ar.pointForms);
      return d > 0 ? { dir: 'up', text: t.up(amount, than) } : { dir: 'down', text: t.down(amount, than) };
    }
    if (!then) return null;
    const r = (now - then) / then;
    if (!Math.round(r * 100)) return { dir: 'level', text: t.level(than) };
    return r > 0 ? { dir: 'up', text: t.up(pct(lang, r), than) } : { dir: 'down', text: t.down(pct(lang, -r), than) };
  };

  const { now, then } = report;
  const range = stayRange(lang, from, addDays(to, -1));
  const peak = series.reduce((a, b) => (b.occ > a.occ ? b : a));
  const low = series.reduce((a, b) => (b.occ < a.occ ? b : a));
  const areaName = area === 'all' ? t.allAreas : (areas.find((a) => a.id === area)?.name[lang] ?? '');
  const direct = report.channelTotal ? (report.byChannel.direct + report.byChannel.whatsapp + report.byChannel.phone) / report.channelTotal : 0;

  const homeTable = (title: string, meta: string, list: typeof report.best) => (
    <Panel title={title} meta={meta} flush>
      <div className="sys-table-wrap">
        <table className="sys-table" aria-label={title}>
          <thead>
            <tr>
              <th scope="col">{t.home}</th>
              <th scope="col" className="end hide-narrow">
                {t.occupancy}
              </th>
              <th scope="col" className="end">
                {t.revenue}
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map(({ unit, perf }) => {
              const open = () => setPanel({ kind: 'unit', code: unit.code });
              return (
                <tr key={unit.code} tabIndex={0} aria-selected={openCode === unit.code} onClick={open} onKeyDown={(e) => onRowKey(e, open)}>
                  <td>
                    <span className="who">
                      <b>
                        <Code>{unit.code}</Code>
                      </b>
                      <span>{unit.name[lang]}</span>
                    </span>
                  </td>
                  <td className="end hide-narrow">{pct(lang, perf.occupancy)}</td>
                  <td className="end">{money(lang, perf.revenue)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );

  return (
    <>
      <PageHead title={nav.reports[lang]} sub={t.sub} phase="wave2" />

      <div className="sys-toolbar">
        <div className="sys-segment" role="group" aria-label={t.periodGroup}>
          {periodKeys.map((k) => (
            <button key={k} type="button" aria-pressed={period === k} onClick={() => setPeriod(k)}>
              {t.periods[k]}
            </button>
          ))}
        </div>
        <span className="sys-muted sys-small">
          <time>{range}</time>
        </span>
      </div>

      <div className="sys-stack">
        <section className="sys-panel">
          <dl className="sys-figures">
            <div className="sys-figure">
              <dt>{t.occupancy}</dt>
              <dd>{pct(lang, now.occupancy)}</dd>
              <DeltaLine delta={change(now.occupancy, then?.occupancy, true)} />
            </div>
            <div className="sys-figure">
              <dt>{t.adr}</dt>
              <dd>{moneyShort(lang, now.adr)}</dd>
              <DeltaLine delta={change(now.adr, then?.adr, false)} />
            </div>
            <div className="sys-figure">
              <dt>{t.revpar}</dt>
              <dd>{moneyShort(lang, now.revpar)}</dd>
              <DeltaLine delta={change(now.revpar, then?.revpar, false)} />
            </div>
            <div className="sys-figure">
              <dt>{t.revenueFigure}</dt>
              <dd>{compact(lang, now.revenue)}</dd>
              <DeltaLine delta={change(now.revenue, then?.revenue, false)} />
            </div>
          </dl>
        </section>

        <div className="fin-pair">
          <Panel title={t.byMonth} meta={`${monthName(lang, series[0].m, false)} – ${monthName(lang, thisMonth, false)}`}>
            <div className="sys-section">
              <div>
                <div className="sys-segment" role="group" aria-label={t.areaGroup}>
                  <button type="button" aria-pressed={area === 'all'} onClick={() => setArea('all')}>
                    {t.allAreas}
                  </button>
                  {areas.map((a) => (
                    <button key={a.id} type="button" aria-pressed={area === a.id} onClick={() => setArea(a.id)}>
                      {a.name[lang]}
                    </button>
                  ))}
                </div>
              </div>
              <div role="img" aria-label={t.chartLabel(areaName, series.map((s) => `${monthName(lang, s.m, false)} ${pct(lang, s.occ)}`).join(t.listSep))}>
                <div className="sys-cols">
                  {series.map((s) => (
                    <div key={s.m} className="sys-col">
                      <span className="sys-col__value">{pct(lang, s.occ)}</span>
                      <div className={`sys-col__fill${s.m === thisMonth ? ' is-now' : ''}`} style={{ blockSize: `${(s.occ * COLUMN_REM).toFixed(3)}rem` }} />
                    </div>
                  ))}
                </div>
                <div className="sys-cols-labels">
                  {series.map((s) => (
                    <span key={s.m}>{day(lang, monthStart(s.m), { month: 'short' })}</span>
                  ))}
                </div>
              </div>
              <p className="sys-small">{t.season[area](pct(lang, peak.occ), monthName(lang, peak.m, false), pct(lang, low.occ), monthName(lang, low.m, false))}</p>
              <p className="sys-muted sys-tiny">{t.nowNote(monthName(lang, thisMonth, false))}</p>
            </div>
          </Panel>

          <Panel title={t.byChannel} meta={t.periods[period]}>
            {report.channelTotal ? (
              <div className="sys-section">
                <div className="sys-bars">
                  {channels.map((ch) => {
                    const share = report.byChannel[ch] / report.channelTotal;
                    return (
                      <div key={ch} className="sys-bar">
                        <span>{channelLabel[ch][lang]}</span>
                        <div className="sys-bar__track">
                          <div className="sys-bar__fill" style={{ inlineSize: `${(share * 100).toFixed(2)}%` }} />
                        </div>
                        <span className="num">
                          {pct(lang, share)} · {money(lang, report.byChannel[ch])}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="sys-muted sys-tiny">{t.direct(pct(lang, direct))}</p>
              </div>
            ) : (
              <Empty title={t.noRevenue} />
            )}
          </Panel>
        </div>

        <Panel title={t.byArea} meta={t.periods[period]} flush>
          <div className="sys-table-wrap">
            <table className="sys-table fin-static" aria-label={t.byArea}>
              <thead>
                <tr>
                  <th scope="col">{t.area}</th>
                  <th scope="col" className="end hide-narrow">
                    {t.homes}
                  </th>
                  <th scope="col" className="end">
                    {t.occupancy}
                  </th>
                  <th scope="col" className="end hide-narrow">
                    {t.adrShort}
                  </th>
                  <th scope="col" className="end">
                    {t.revenue}
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.byArea.map(({ area: a, homes, perf }) => (
                  <tr key={a.id}>
                    <td className="wrap">{a.name[lang]}</td>
                    <td className="end hide-narrow">{num(lang, homes)}</td>
                    <td className="end">{pct(lang, perf.occupancy)}</td>
                    <td className="end hide-narrow">{money(lang, perf.adr)}</td>
                    <td className="end">{money(lang, perf.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="fin-pair">
          {homeTable(t.best, t.bestMeta, report.best)}
          {homeTable(t.quiet, t.quietMeta, report.quiet)}
        </div>
      </div>
    </>
  );
}
