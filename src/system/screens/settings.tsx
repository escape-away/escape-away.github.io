'use client';

import { Copy, RefreshCw } from 'lucide-react';
import { Fragment, useMemo, type KeyboardEvent, type ReactNode } from 'react';
import { channelLabel, nav, useCopy, useLang } from '../copy';
import { cairoToday } from '../dates';
import { ago, clock, count, day, homesCount } from '../format';
import { useData, useDemo, useNow } from '../store';
import type { Feed, Lang, OtaChannel } from '../types';
import { Badge, Code, PageHead, Panel } from '../ui/bits';

/** The word forms format.ts's count() takes for each language. */
type Forms = { one: string; other: string; two?: string; few?: string; many?: string };

const en = {
  sub: 'Channels, calendar links and team access',
  modeTitle: 'Calendar links mode:',
  mode: (every: string, airbnb: string) =>
    `the system reads every Airbnb and Booking.com calendar every ${every}. Airbnb reads ours about every ${airbnb} and Booking.com on its own schedule, so every direct booking also sends the team a WhatsApp alert to close the dates by hand. The Channex upgrade replaces the links with an instant two-way connection, with prices set once for every channel.`,
  minuteForms: { one: '# minute', other: '# minutes' } as Forms,
  hourForms: { one: '# hour', other: '# hours' } as Forms,
  linkForms: { one: '# link', other: '# links' } as Forms,
  links: 'Calendar links',
  syncNow: 'Sync now',
  unit: 'Unit',
  ours: 'Our link',
  // "Synced 4 min ago" and "Not answering since 2:41 PM"; phones drop the first and last parts.
  synced: 'Synced',
  notAnswering: 'Not answering',
  since: (time: string) => `since ${time}`,
  notListed: 'Not listed',
  copy: 'Copy',
  copyLabel: (code: string) => `Copy the calendar link for ${code}`,
  copied: 'Link copied.',
  foot: (links: string, airbnb: string, booking: string, when: string) =>
    `${links}: ${airbnb} on Airbnb and ${booking} on Booking.com, last read ${when}. Our link goes into each platform once.`,
  read: 'Calendar links read just now.',
  stillOne: (channel: string, unit: string) => ` The ${channel} link for ${unit} still isn’t answering.`,
  stillMany: (links: string) => ` ${links} still aren’t answering.`,
  team: 'Team and access',
  roles: [
    { name: 'Admin', can: 'Everything: prices, channels, team accounts and these settings.' },
    { name: 'Reservations', can: 'Bookings, guests and the calendar: takes direct bookings, fills in calendar imports and fixes clashes.' },
    { name: 'Operations', can: 'Cleaning and repairs in every area: plans the day’s tasks and blocks nights for maintenance.' },
    { name: 'Finance', can: 'Payments, owner statements and payouts. Sees every booking, changes none.' },
    { name: 'Owner', can: 'Only their own homes, bookings and statements, plus blocking dates for their own stays.' },
    { name: 'Housekeeping', can: 'Only today’s tasks in their area, on the housekeeping app.' },
  ],
  audit: 'Every change to a price, a calendar or a booking is logged with who, what, before and after.',
  activity: 'Recent activity',
  activityHint: 'Messages the system sent the team on WhatsApp.',
  noActivity: 'No messages yet today.',
};

const ar: typeof en = {
  sub: 'القنوات وروابط التقويم وصلاحيات الفريق',
  modeTitle: 'وضع روابط التقويم:',
  mode: (every, airbnb) =>
    `السيستم بيقرأ تقويم كل وحدة على Airbnb و Booking.com كل ${every}. إنما Airbnb بيقرأ تقويمنا كل ${airbnb} تقريبًا، و Booking.com على مواعيده هو، فكل حجز مباشر بيبعت كمان تنبيه واتساب للفريق يقفل التواريخ يدوي. ترقية Channex بتبدّل الروابط دي بربط فوري في الاتجاهين، والأسعار بتتحط مرة واحدة لكل القنوات.`,
  minuteForms: { one: 'دقيقة واحدة', two: 'دقيقتين', few: '# دقايق', many: '# دقيقة', other: '# دقيقة' },
  hourForms: { one: 'ساعة', two: 'ساعتين', few: '# ساعات', many: '# ساعة', other: '# ساعة' },
  linkForms: { one: 'رابط واحد', two: 'رابطين', few: '# روابط', many: '# رابط', other: '# رابط' },
  links: 'روابط التقويم',
  syncNow: 'حدّث دلوقتي',
  unit: 'الوحدة',
  ours: 'رابطنا',
  synced: 'آخر تحديث',
  notAnswering: 'مش بيرد',
  since: (time) => `من ${time}`,
  notListed: 'مش معروضة',
  copy: 'نسخ',
  copyLabel: (code) => `انسخ رابط تقويم ${code}`,
  copied: 'الرابط اتنسخ.',
  foot: (links, airbnb, booking, when) =>
    `${links}: ${airbnb} على Airbnb و${booking} على Booking.com، وآخر قراءة ${when}. رابطنا بيتحط في كل منصة مرة واحدة بس.`,
  read: 'روابط التقويم اتقرت دلوقتي.',
  stillOne: (channel, unit) => ` رابط ${channel} لـ ${unit} لسه مش بيرد.`,
  stillMany: (links) => ` ${links} لسه مش بترد.`,
  team: 'الفريق والصلاحيات',
  roles: [
    { name: 'مدير النظام', can: 'كل حاجة: الأسعار والقنوات وحسابات الفريق والإعدادات دي.' },
    { name: 'الحجوزات', can: 'الحجوزات والضيوف والتقويم: بياخدوا الحجوزات المباشرة، ويكمّلوا بيانات حجوزات الروابط، ويحلّوا التعارضات.' },
    { name: 'التشغيل', can: 'النضافة والصيانة في كل المناطق: بيرتّبوا مهام اليوم ويقفلوا ليالي للصيانة.' },
    { name: 'الحسابات', can: 'المدفوعات وكشوف حساب الملاك والتحويلات. بيشوفوا كل الحجوزات من غير ما يغيّروا فيها.' },
    { name: 'المالك', can: 'وحداته وحجوزاتها وكشوف حسابه بس، ويقدر يقفل تواريخ لإقامته.' },
    { name: 'النضافة', can: 'مهام النهاردة في منطقتهم بس، من تطبيق النضافة.' },
  ],
  audit: 'أي تغيير في سعر أو تقويم أو حجز بيتسجّل: مين عمله، وإيه اللي اتغيّر، وكان إيه وبقى إيه.',
  activity: 'آخر النشاط',
  activityHint: 'رسايل السيستم للفريق على واتساب.',
  noActivity: 'مفيش رسايل لسه النهاردة.',
};

const copy = { en, ar };

/** Rows open their side panel from the keyboard too; the Copy button inside keeps its own keys. */
function onRowKey(e: KeyboardEvent<HTMLTableRowElement>, open: () => void) {
  if (e.target !== e.currentTarget) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    open();
  }
}

/** Unit codes and our references inside a team message stay one unbroken left-to-right piece. */
function withCodes(text: string): ReactNode[] {
  return text.split(/([A-Z]{2}-[A-Z]{3}-\d{3}|EA-\d{4}-\d{4})/g).map((part, i) => (i % 2 ? <Code key={i}>{part}</Code> : part));
}

function LinkStatus({ feed, now }: { feed?: Feed; now: number }) {
  const lang = useLang();
  const t = useCopy(copy);
  if (!feed) return <span className="sys-muted">{t.notListed}</span>;
  if (!feed.ok) {
    return (
      <Badge tone="warn">
        {t.notAnswering}
        <span className="hide-narrow">{t.since(clock(lang, feed.lastSync))}</span>
      </Badge>
    );
  }
  return (
    <span>
      <span className="hide-narrow">{t.synced} </span>
      {ago(lang, feed.lastSync, now)}
    </span>
  );
}

export function SettingsScreen() {
  const lang = useLang();
  const t = useCopy(copy);
  const data = useData();
  const now = useNow();
  const { dispatch, panel, setPanel, toast } = useDemo();

  // One row per unit, the ones with a link that isn't answering first.
  const rows = useMemo(() => {
    const byUnit = new Map<string, Partial<Record<OtaChannel, Feed>>>();
    for (const f of data.feeds) byUnit.set(f.unit, { ...byUnit.get(f.unit), [f.channel]: f });
    return data.units
      .map((unit) => {
        const feeds = byUnit.get(unit.code) ?? {};
        return { unit, airbnb: feeds.airbnb, booking: feeds.booking, down: feeds.airbnb?.ok === false || feeds.booking?.ok === false };
      })
      .sort((a, b) => Number(b.down) - Number(a.down));
  }, [data.feeds, data.units]);

  const recent = useMemo(() => [...data.alerts].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 6), [data.alerts]);

  const down = data.feeds.filter((f) => !f.ok);
  const lastRead = data.feeds.reduce((last, f) => (f.ok && Date.parse(f.lastSync) > Date.parse(last) ? f.lastSync : last), data.now);
  const listedOn = (channel: OtaChannel) => new Set(data.feeds.filter((f) => f.channel === channel).map((f) => f.unit)).size;
  const openCode = panel?.kind === 'unit' ? panel.code : null;
  const open = (code: string) => setPanel({ kind: 'unit', code });

  const syncNow = () => {
    dispatch({ type: 'feeds/sync', at: new Date().toISOString() });
    // Reading again refreshes the links that answer; one that is down stays down until its platform answers.
    const still = (l: Lang) =>
      down.length === 0
        ? ''
        : down.length === 1
          ? copy[l].stillOne(channelLabel[down[0].channel][l], down[0].unit)
          : copy[l].stillMany(count(l, down.length, en.linkForms, ar.linkForms));
    toast({ en: en.read + still('en'), ar: ar.read + still('ar') }, down.length ? 'warning' : 'success');
  };

  return (
    <>
      <PageHead title={nav.settings[lang]} sub={t.sub} phase="core" />

      <div className="sys-stack">
        <div className="sys-note" data-tone="info">
          <p>
            <b>{t.modeTitle}</b> {t.mode(count(lang, 15, en.minuteForms, ar.minuteForms), count(lang, 3, en.hourForms, ar.hourForms))}
          </p>
        </div>

        <Panel
          title={t.links}
          action={
            <button type="button" className="sys-btn sys-btn--secondary sys-btn--small" onClick={syncNow}>
              <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
              {t.syncNow}
            </button>
          }
          flush
        >
          <div className="sys-table-wrap">
            <table className="sys-table" aria-label={t.links}>
              <thead>
                <tr>
                  <th scope="col">{t.unit}</th>
                  <th scope="col">
                    <bdi>{channelLabel.airbnb[lang]}</bdi>
                  </th>
                  <th scope="col">
                    <bdi>{channelLabel.booking[lang]}</bdi>
                  </th>
                  <th scope="col" className="hide-medium">
                    {t.ours}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ unit, airbnb, booking }) => (
                  <tr
                    key={unit.code}
                    tabIndex={0}
                    aria-selected={openCode === unit.code}
                    onClick={() => open(unit.code)}
                    onKeyDown={(e) => onRowKey(e, () => open(unit.code))}
                  >
                    <td>
                      <Code>{unit.code}</Code>
                    </td>
                    <td>
                      <LinkStatus feed={airbnb} now={now} />
                    </td>
                    <td>
                      <LinkStatus feed={booking} now={now} />
                    </td>
                    <td className="hide-medium">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="sys-muted sys-tiny">
                          <Code>{`…/ical/${unit.code.toLowerCase()}.ics`}</Code>
                        </span>
                        <button
                          type="button"
                          className="sys-btn sys-btn--quiet sys-btn--small"
                          aria-label={t.copyLabel(unit.code)}
                          onClick={(e) => {
                            e.stopPropagation();
                            toast({ en: en.copied, ar: ar.copied }, 'success');
                          }}
                        >
                          <Copy size={16} strokeWidth={1.75} aria-hidden="true" />
                          {t.copy}
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="sys-panel__foot sys-muted sys-tiny">
            {t.foot(
              count(lang, data.feeds.length, en.linkForms, ar.linkForms),
              homesCount(lang, listedOn('airbnb')),
              homesCount(lang, listedOn('booking')),
              ago(lang, lastRead, now),
            )}
          </p>
        </Panel>

        <Panel title={t.team}>
          <div className="sys-grid sys-grid--2">
            <dl className="sys-dl">
              {t.roles.map((role) => (
                <Fragment key={role.name}>
                  <dt>{role.name}</dt>
                  <dd>{role.can}</dd>
                </Fragment>
              ))}
            </dl>
            <div className="sys-stack">
              <p className="sys-note">{t.audit}</p>
              <section className="sys-section">
                <h3>{t.activity}</h3>
                <p className="sys-muted sys-tiny">{t.activityHint}</p>
                {recent.length ? (
                  <ul className="sys-list">
                    {recent.map((a) => {
                      // A message from an earlier day carries its date too, so last night's alert never reads as today's.
                      const sent = cairoToday(new Date(a.at));
                      return (
                        <li key={a.id} style={{ display: 'grid', gridTemplateColumns: '4.5rem minmax(0, 1fr)', gap: 12, paddingBlock: 10 }}>
                          <time className="sys-muted sys-tiny" dateTime={a.at} style={{ display: 'grid', alignContent: 'start' }}>
                            {sent !== data.today ? <span>{day(lang, sent, { day: 'numeric', month: 'short' })}</span> : null}
                            <span>{clock(lang, a.at)}</span>
                          </time>
                          <span className="sys-small">{withCodes(a.text[lang])}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="sys-muted sys-small">{t.noActivity}</p>
                )}
              </section>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
