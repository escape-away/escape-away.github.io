'use client';

import { CalendarPlus, CircleDashed, RefreshCw, TriangleAlert, Wrench, SprayCan } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { compoundByCode, staff, unitByCode } from '../catalog';
import { channelLabel, common, taskLabel, taskStatus, useCopy, useLang } from '../copy';
import { addMonths, monthOf, monthStart } from '../dates';
import { ago, clock, compact, homesCount, longDay, monthName, nights as nightsText, pct, stayRange } from '../format';
import { nightsOf } from '../ops';
import { arrivals, clashes, departures, inHouse, needsDetails, performance } from '../select';
import { useData, useDemo, useNow } from '../store';
import type { Reservation } from '../types';
import { Badge, ChannelChip, Code, Dots, Empty, PageHead, Panel, StatusBadge } from '../ui/bits';

const copy = {
  en: {
    title: 'Today',
    newBooking: 'New booking',
    clash: (unit: string, range: string) => (
      <>
        Two bookings overlap on <Code>{unit}</Code> ({range}). Both are saved. Fix before the guests arrive.
      </>
    ),
    review: 'Review',
    feedDown: (unit: string, ch: string, at: string) => (
      <>
        The {ch} link for <Code>{unit}</Code> hasn’t answered since {at}. Its nights may be out of date there.
      </>
    ),
    openUnit: 'Open the unit',
    missing: (n: number) => `${n} Airbnb and Booking.com ${n === 1 ? 'booking still needs its' : 'bookings still need their'} guest details.`,
    fill: 'Fill them in',
    occupied: 'Occupied tonight',
    of: (a: number, b: number) => `${a} of ${b}`,
    arriving: 'Arriving today',
    leaving: 'Leaving today',
    cleans: 'Cleans today',
    cleansDone: (n: number) => `${n} done`,
    month: 'Booked this month, EGP',
    vsLast: (v: string, m: string) => `${v} in ${m}`,
    noArrivals: 'No arrivals today.',
    noArrivalsHint: 'New bookings for today will show up here.',
    noDepartures: 'No departures today.',
    work: 'Cleaning and repairs',
    workMeta: (n: number) => `${n} today`,
    noWork: 'Nothing scheduled today.',
    team: 'Sent to the team',
    teamMeta: 'WhatsApp',
    teamHint: 'Until the Channex upgrade, every direct booking asks the team to close its nights on Airbnb and Booking.com by hand.',
    sync: (homes: string, when: string) => `Calendar links read for ${homes}, last run ${when}.`,
    syncBad: (n: number) => `${n} link not answering.`,
    calendar: 'Open the calendar',
    clean: { todo: 'Clean waiting', doing: 'Cleaning', done: 'Clean done' },
    attention: 'Needs attention',
  },
  ar: {
    title: 'النهاردة',
    newBooking: 'حجز جديد',
    clash: (unit: string, range: string) => (
      <>
        حجزين متداخلين على <Code>{unit}</Code> ({range}). الاتنين محفوظين. صلّحه قبل وصول الضيوف.
      </>
    ),
    review: 'راجع',
    feedDown: (unit: string, ch: string, at: string) => (
      <>
        رابط {ch} لـ <Code>{unit}</Code> مش بيرد من {at}. ممكن الليالي هناك تكون مش متحدّثة.
      </>
    ),
    openUnit: 'افتح الوحدة',
    missing: (n: number) => `${n} حجوزات من Airbnb و Booking.com لسه ناقصها بيانات الضيف.`,
    fill: 'كمّلها',
    occupied: 'مشغول الليلة',
    of: (a: number, b: number) => `${a} من ${b}`,
    arriving: 'وصول النهاردة',
    leaving: 'مغادرة النهاردة',
    cleans: 'نضافة النهاردة',
    cleansDone: (n: number) => `${n} خلصت`,
    month: 'محجوز الشهر ده، ج.م',
    vsLast: (v: string, m: string) => `${v} في ${m}`,
    noArrivals: 'مفيش وصول النهاردة.',
    noArrivalsHint: 'الحجوزات الجديدة للنهاردة هتظهر هنا.',
    noDepartures: 'مفيش مغادرة النهاردة.',
    work: 'النضافة والصيانة',
    workMeta: (n: number) => `${n} النهاردة`,
    noWork: 'مفيش حاجة متجدولة النهاردة.',
    team: 'اتبعت للفريق',
    teamMeta: 'واتساب',
    teamHint: 'لحد ترقية Channex، كل حجز مباشر بيطلب من الفريق يقفل لياليه على Airbnb و Booking.com يدوي.',
    sync: (homes: string, when: string) => `روابط التقويم اتقرت لـ ${homes}، آخر مرة ${when}.`,
    syncBad: (n: number) => `${n} رابط مش بيرد.`,
    calendar: 'افتح التقويم',
    clean: { todo: 'النضافة مستنية', doing: 'بيتنضف', done: 'اتنضف' },
    attention: 'محتاج اهتمام',
  },
};

function StayRow({ res, onOpen, end }: { res: Reservation; onOpen: () => void; end?: ReactNode }) {
  const lang = useLang();
  const c = useCopy(common);
  const data = useData();
  const unit = unitByCode[res.unit];
  const guest = res.guestId ? data.guests.find((g) => g.id === res.guestId) : undefined;
  return (
    <button type="button" className="sys-row" onClick={onOpen}>
      <span className="sys-row__lead hide-medium">
        <ChannelChip channel={res.channel} />
      </span>
      <span className="sys-row__main">
        <b>{guest ? <bdi>{guest.name}</bdi> : <span className="sys-muted">{c.needsDetails}</span>}</b>
        <span className="hide-medium">
          <Dots parts={[<Code key="u">{unit.code}</Code>, nightsText(lang, nightsOf(res))]} />
        </span>
        <span className="show-medium">
          <Dots parts={[<Code key="u">{unit.code}</Code>, channelLabel[res.channel][lang], nightsText(lang, nightsOf(res))]} />
        </span>
      </span>
      <span className="sys-row__end">{end ?? <StatusBadge status={res.status} />}</span>
    </button>
  );
}

export function TodayScreen() {
  const lang = useLang();
  const t = useCopy(copy);
  const c = useCopy(common);
  const data = useData();
  const now = useNow();
  const { setPanel } = useDemo();
  const today = data.today;

  const view = useMemo(() => {
    const month = monthOf(today);
    const thisMonth = performance(data, monthStart(month), monthStart(addMonths(month, 1)));
    const lastMonth = performance(data, monthStart(addMonths(month, -1)), monthStart(month));
    const tonight = inHouse(data, today);
    const tasks = data.tasks.filter((x) => x.date === today);
    const failing = data.feeds.filter((f) => !f.ok);
    const lastRun = data.feeds.filter((f) => f.ok).reduce((m, f) => (f.lastSync > m ? f.lastSync : m), '');
    return {
      month,
      thisMonth,
      lastMonth,
      occupied: new Set(tonight.map((r) => r.unit)).size,
      arrivals: arrivals(data, today),
      departures: departures(data, today),
      tasks,
      cleans: tasks.filter((x) => x.type === 'turnover'),
      clashes: clashes(data),
      missing: needsDetails(data),
      failing,
      lastRun,
    };
  }, [data, today]);

  const tasksByUnit = new Map(view.tasks.map((x) => [x.reservationId ?? x.id, x]));

  return (
    <>
      <PageHead
        title={t.title}
        sub={`${longDay(lang, today)} · ${c.sample}`}
        phase="core"
        actions={
          <button type="button" className="sys-btn sys-btn--primary" onClick={() => setPanel({ kind: 'new' })}>
            <CalendarPlus size={17} strokeWidth={1.75} aria-hidden="true" />
            {t.newBooking}
          </button>
        }
      />

      {view.clashes.length || view.failing.length || view.missing.length ? (
        <div className="sys-alerts">
          {/* A clash costs money, so it alone gets the red line; the rest wait quietly in one block. */}
          {view.clashes.map((cl) => (
            <div key={cl.ids.join()} className="sys-alert" role="alert">
              <TriangleAlert size={18} strokeWidth={1.75} aria-hidden="true" />
              <p className="sys-alert__text">{t.clash(cl.unit, stayRange(lang, cl.from, cl.to))}</p>
              <button type="button" className="sys-btn sys-btn--secondary sys-btn--small" onClick={() => setPanel({ kind: 'reservation', id: cl.ids[1] })}>
                {t.review}
              </button>
            </div>
          ))}
          {view.failing.length || view.missing.length ? (
            <section className="sys-panel" aria-label={t.attention}>
              <ul className="sys-list">
                {view.failing.map((f) => (
                  <li key={`${f.unit}-${f.channel}`} className="sys-attn">
                    <RefreshCw size={17} strokeWidth={1.75} aria-hidden="true" className="is-warn" />
                    <p>{t.feedDown(f.unit, f.channel === 'airbnb' ? 'Airbnb' : 'Booking.com', clock(lang, f.lastSync))}</p>
                    <button type="button" className="sys-btn sys-btn--quiet sys-btn--small" onClick={() => setPanel({ kind: 'unit', code: f.unit })}>
                      {t.openUnit}
                    </button>
                  </li>
                ))}
                {view.missing.length ? (
                  <li className="sys-attn">
                    <CircleDashed size={17} strokeWidth={1.75} aria-hidden="true" className="is-info" />
                    <p>{t.missing(view.missing.length)}</p>
                    <Link href="/admin/reservations?view=details" className="sys-btn sys-btn--quiet sys-btn--small">
                      {t.fill}
                    </Link>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      <div className="sys-stack">
        <section className="sys-panel">
          <dl className="sys-figures">
            <div className="sys-figure">
              <dt>{t.occupied}</dt>
              <dd>{pct(lang, view.occupied / data.units.length)}</dd>
              <span className="sys-delta sys-muted">{t.of(view.occupied, data.units.length)}</span>
            </div>
            <div className="sys-figure">
              <dt>{t.arriving}</dt>
              <dd>{view.arrivals.length}</dd>
            </div>
            <div className="sys-figure">
              <dt>{t.leaving}</dt>
              <dd>{view.departures.length}</dd>
            </div>
            <div className="sys-figure">
              <dt>{t.cleans}</dt>
              <dd>{view.cleans.length}</dd>
              <span className="sys-delta sys-muted">{t.cleansDone(view.cleans.filter((x) => x.status === 'done').length)}</span>
            </div>
            <div className="sys-figure">
              <dt>{t.month}</dt>
              <dd>{compact(lang, view.thisMonth.revenue)}</dd>
              <span className="sys-delta sys-muted">
                {t.vsLast(compact(lang, view.lastMonth.revenue), monthName(lang, addMonths(view.month, -1), false))}
              </span>
            </div>
          </dl>
        </section>

        <div className="sys-grid sys-grid--2">
          <Panel title={t.arriving} meta={view.arrivals.length || undefined} flush>
            {view.arrivals.length ? (
              <ul className="sys-list">
                {view.arrivals.map((r) => (
                  <li key={r.id}>
                    <StayRow res={r} onOpen={() => setPanel({ kind: 'reservation', id: r.id })} />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty title={t.noArrivals}>{t.noArrivalsHint}</Empty>
            )}
          </Panel>
          <Panel title={t.leaving} meta={view.departures.length || undefined} flush>
            {view.departures.length ? (
              <ul className="sys-list">
                {view.departures.map((r) => {
                  const task = tasksByUnit.get(r.id);
                  return (
                    <li key={r.id}>
                      <StayRow
                        res={r}
                        onOpen={() => setPanel({ kind: 'reservation', id: r.id })}
                        end={
                          task ? (
                            <Badge tone={task.status === 'done' ? 'ok' : task.status === 'doing' ? 'info' : 'warn'}>{t.clean[task.status]}</Badge>
                          ) : (
                            <StatusBadge status={r.status} />
                          )
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty title={t.noDepartures} />
            )}
          </Panel>
        </div>

        <div className="sys-grid sys-grid--2 sys-grid--top">
          <Panel title={t.work} meta={t.workMeta(view.tasks.length)} flush>
            {view.tasks.length ? (
              <ul className="sys-list">
                {view.tasks.map((task) => {
                  const unit = unitByCode[task.unit];
                  const person = staff.find((s) => s.id === task.staffId);
                  const Icon = task.type === 'maintenance' ? Wrench : SprayCan;
                  return (
                    <li key={task.id}>
                      <button type="button" className="sys-row" onClick={() => setPanel({ kind: 'unit', code: unit.code })}>
                        <span className="sys-time" aria-hidden="true">
                          <Icon size={17} strokeWidth={1.75} />
                        </span>
                        <span className="sys-row__main">
                          <b>
                            <Dots parts={[<Code key="u">{unit.code}</Code>, task.issue ? task.issue[lang] : taskLabel[task.type][lang]]} />
                          </b>
                          <span>
                            <Dots
                              parts={[
                                <span key="w" className="ltr">
                                  {task.window[0]}–{task.window[1]}
                                </span>,
                                person?.name[lang],
                                compoundByCode[unit.compound].name[lang],
                              ]}
                            />
                          </span>
                        </span>
                        <Badge tone={task.status === 'done' ? 'ok' : task.status === 'doing' ? 'info' : 'warn'}>{taskStatus[task.status][lang]}</Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty title={t.noWork} />
            )}
          </Panel>
          <Panel title={t.team} meta={t.teamMeta}>
            <div style={{ display: 'grid', gap: 10 }}>
              {data.alerts.slice(0, 5).map((a) => (
                <div key={a.id} className="wa-msg">
                  <span>{a.text[lang]}</span>
                  <time>{clock(lang, a.at)}</time>
                </div>
              ))}
              <p className="sys-muted sys-tiny">{t.teamHint}</p>
            </div>
          </Panel>
        </div>

        <p className="sys-muted sys-small" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <RefreshCw size={15} strokeWidth={1.75} aria-hidden="true" />
          {t.sync(homesCount(lang, data.units.length), view.lastRun ? ago(lang, view.lastRun, now) : '')}
          {view.failing.length ? <span>{t.syncBad(view.failing.length)}</span> : null}
          <Link href="/admin/calendar" className="sys-btn sys-btn--quiet sys-btn--small">
            {t.calendar}
          </Link>
        </p>
      </div>
    </>
  );
}
