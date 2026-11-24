'use client';

import { CalendarPlus, Search } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { areaById, areas, compoundByCode, ownerById } from '../catalog';
import { channelLabel, common, nav, packageLabel, useCopy, useLang } from '../copy';
import { addMonths, monthOf, monthStart } from '../dates';
import { clock, count, day, guestsCount, homesCount, money, monthName, num, pct } from '../format';
import { live, performance } from '../select';
import { useData, useDemo } from '../store';
import type { AreaId, Feed } from '../types';
import { Badge, ChannelChip, Code, Empty, PageHead, Panel } from '../ui/bits';

/** The word forms format.ts's count() takes for each language. */
type Forms = { one: string; other: string; two?: string; few?: string; many?: string };

const en = {
  sub: (homes: string, places: string) => `${homes} across ${places} · sample data`,
  areaForms: { one: '# area', other: '# areas' } as Forms,
  bedroomForms: { one: '# bedroom', other: '# bedrooms' } as Forms,
  areaGroup: 'Area',
  all: 'All',
  filter: 'Filter by code, name or compound',
  filterLabel: 'Filter homes',
  unit: 'Unit',
  where: 'Where',
  sleeps: 'Sleeps',
  owner: 'Owner',
  channels: 'Channels',
  occupancy: 'Occupancy',
  revenue: 'Revenue',
  next: 'Next arrival',
  month: (month: string) => `Occupancy and revenue for ${month}`,
  studio: 'Studio',
  notAnswering: 'Not answering',
  failingSince: (time: string) => `Not answering since ${time}`,
  today: 'Today',
  notBooked: 'Not booked',
  showAll: 'Show every home',
};

const ar: typeof en = {
  sub: (homes, places) => `${homes} في ${places} · بيانات تجريبية`,
  areaForms: { one: 'منطقة واحدة', two: 'منطقتين', few: '# مناطق', many: '# منطقة', other: '# منطقة' },
  bedroomForms: { one: 'غرفة نوم', two: 'غرفتا نوم', few: '# غرف نوم', many: '# غرفة نوم', other: '# غرفة نوم' },
  areaGroup: 'المنطقة',
  all: 'الكل',
  filter: 'دوّر بالكود أو الاسم أو الكمبوند',
  filterLabel: 'دوّر على وحدة',
  unit: 'الوحدة',
  where: 'المكان',
  sleeps: 'السعة',
  owner: 'المالك',
  channels: 'القنوات',
  occupancy: 'الإشغال',
  revenue: 'الإيراد',
  next: 'أقرب وصول',
  month: (month) => `الإشغال والإيراد لشهر ${month}`,
  studio: 'استوديو',
  notAnswering: 'مش بيرد',
  failingSince: (time) => `مش بيرد من ${time}`,
  today: 'النهاردة',
  notBooked: 'مفيش حجز',
  showAll: 'اعرض كل الوحدات',
};

const copy = { en, ar };

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

export function UnitsScreen() {
  const lang = useLang();
  const t = useCopy(copy);
  const c = useCopy(common);
  const data = useData();
  const { panel, setPanel } = useDemo();
  const [area, setArea] = useState<AreaId | 'all'>('all');
  const [query, setQuery] = useState('');
  const month = monthOf(data.today);

  // Every unit's month, calendar links and next arrival, worked out once for each change to the data.
  const rows = useMemo(() => {
    const from = monthStart(month);
    const to = monthStart(addMonths(month, 1));
    const feeds = new Map<string, Feed[]>();
    for (const f of data.feeds) feeds.set(f.unit, [...(feeds.get(f.unit) ?? []), f]);
    const next = new Map<string, string>();
    for (const r of live(data)) {
      if (r.checkIn < data.today) continue;
      const first = next.get(r.unit);
      if (!first || r.checkIn < first) next.set(r.unit, r.checkIn);
    }
    return data.units.map((unit) => ({
      unit,
      perf: performance(data, from, to, new Set([unit.code])),
      feeds: (feeds.get(unit.code) ?? []).sort((a, b) => (a.channel === b.channel ? 0 : a.channel === 'airbnb' ? -1 : 1)),
      next: next.get(unit.code),
    }));
  }, [data, month]);

  const matched = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return rows;
    return rows.filter(({ unit }) => {
      const compound = compoundByCode[unit.compound].name;
      return [unit.code, unit.name.en, unit.name.ar, compound.en, compound.ar].some((text) => fold(text).includes(q));
    });
  }, [rows, query]);

  // Each area's count follows the text filter, so a choice never promises homes it would hide.
  const counts = useMemo(() => {
    const out = new Map<AreaId, number>();
    for (const { unit } of matched) out.set(unit.area, (out.get(unit.area) ?? 0) + 1);
    return out;
  }, [matched]);

  const shown = area === 'all' ? matched : matched.filter(({ unit }) => unit.area === area);
  const areaTotal = new Set(data.units.map((u) => u.area)).size;
  const openCode = panel?.kind === 'unit' ? panel.code : null;
  const open = (code: string) => setPanel({ kind: 'unit', code });

  return (
    <>
      <PageHead
        title={nav.units[lang]}
        sub={t.sub(homesCount(lang, data.units.length), count(lang, areaTotal, en.areaForms, ar.areaForms))}
        phase="core"
        actions={
          <button type="button" className="sys-btn sys-btn--primary" onClick={() => setPanel({ kind: 'new' })}>
            <CalendarPlus size={17} strokeWidth={1.75} aria-hidden="true" />
            {c.newBooking}
          </button>
        }
      />

      <div className="sys-toolbar">
        <div className="sys-segment" role="group" aria-label={t.areaGroup}>
          <button type="button" aria-pressed={area === 'all'} onClick={() => setArea('all')}>
            {t.all}
            <span className="n">{num(lang, matched.length)}</span>
          </button>
          {areas.map((a) => (
            <button key={a.id} type="button" aria-pressed={area === a.id} onClick={() => setArea(a.id)}>
              {a.name[lang]}
              <span className="n">{num(lang, counts.get(a.id) ?? 0)}</span>
            </button>
          ))}
        </div>
        <label className="sys-filter grow">
          <Search size={16} strokeWidth={1.75} aria-hidden="true" />
          <input
            className="sys-input"
            type="search"
            placeholder={t.filter}
            aria-label={t.filterLabel}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      <Panel title={homesCount(lang, shown.length)} meta={t.month(monthName(lang, month, false))} flush>
        {shown.length ? (
          <div className="sys-table-wrap">
            <table className="sys-table" aria-label={nav.units[lang]}>
              <thead>
                <tr>
                  <th scope="col">{t.unit}</th>
                  <th scope="col" className="hide-medium">
                    {t.where}
                  </th>
                  <th scope="col" className="hide-medium">
                    {t.sleeps}
                  </th>
                  <th scope="col" className="hide-medium">
                    {t.owner}
                  </th>
                  <th scope="col" className="hide-narrow">
                    {t.channels}
                  </th>
                  <th scope="col" className="end">
                    {t.occupancy}
                  </th>
                  <th scope="col" className="end hide-narrow">
                    {t.revenue}
                  </th>
                  <th scope="col">{t.next}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ unit, perf, feeds, next }) => {
                  const owner = ownerById[unit.ownerId];
                  return (
                    <tr
                      key={unit.code}
                      tabIndex={0}
                      aria-selected={openCode === unit.code}
                      onClick={() => open(unit.code)}
                      onKeyDown={(e) => onRowKey(e, () => open(unit.code))}
                    >
                      <td>
                        <span className="who">
                          <b>
                            <Code>{unit.code}</Code>
                          </b>
                          <span>{unit.name[lang]}</span>
                        </span>
                      </td>
                      <td className="wrap hide-medium">
                        {compoundByCode[unit.compound].name[lang]} · {areaById[unit.area].name[lang]}
                      </td>
                      {/* Short second lines sit in <small>, so they skip the 9rem floor .who gives wrapping names. */}
                      <td className="hide-medium">
                        <span className="who">
                          <b>{guestsCount(lang, unit.guests)}</b>
                          <small className="sys-muted sys-tiny">
                            {unit.bedrooms ? count(lang, unit.bedrooms, en.bedroomForms, ar.bedroomForms) : t.studio}
                          </small>
                        </span>
                      </td>
                      <td className="hide-medium">
                        <span className="who">
                          <b>{owner.name[lang]}</b>
                          <small className="sys-muted sys-tiny">{packageLabel[owner.package][lang]}</small>
                        </span>
                      </td>
                      <td className="hide-narrow">
                        <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 4 }}>
                          {feeds.map((f) =>
                            f.ok ? (
                              <ChannelChip key={f.channel} channel={f.channel} />
                            ) : (
                              // The state's word sits under the badge, so one failing link doesn't widen the column.
                              <span
                                key={f.channel}
                                title={t.failingSince(clock(lang, f.lastSync))}
                                style={{ display: 'grid', justifyItems: 'start', gap: 2 }}
                              >
                                <Badge tone="warn">
                                  <bdi>{channelLabel[f.channel][lang]}</bdi>
                                </Badge>
                                <small className="sys-tiny" style={{ color: 'var(--warn)' }}>
                                  {t.notAnswering}
                                </small>
                              </span>
                            ),
                          )}
                        </span>
                      </td>
                      <td className="end">{pct(lang, perf.occupancy)}</td>
                      <td className="end hide-narrow">{money(lang, perf.revenue)}</td>
                      <td>
                        {next ? (
                          <time dateTime={next}>{next === data.today ? t.today : day(lang, next, { day: 'numeric', month: 'short' })}</time>
                        ) : (
                          <span className="sys-muted">{t.notBooked}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title={c.noResults}>
            <button
              type="button"
              className="sys-btn sys-btn--secondary sys-btn--small"
              onClick={() => {
                setQuery('');
                setArea('all');
              }}
            >
              {t.showAll}
            </button>
          </Empty>
        )}
      </Panel>
    </>
  );
}
