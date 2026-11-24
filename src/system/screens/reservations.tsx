'use client';

import { CalendarPlus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { unitByCode, compoundByCode } from '../catalog';
import { channelLabel, common, useCopy, useLang } from '../copy';
import { day, money, nights as nightsText, stayRange } from '../format';
import { nightsOf } from '../ops';
import { clashIds } from '../select';
import { useData, useDemo } from '../store';
import type { Channel, Reservation } from '../types';
import { Badge, Code, Empty, PageHead, StatusBadge } from '../ui/bits';

type View = 'upcoming' | 'stay' | 'details' | 'pending' | 'clash' | 'past' | 'cancelled';

const copy = {
  en: {
    title: 'Reservations',
    sub: 'Every booking from every channel in one list: Airbnb, Booking.com, the website, WhatsApp and phone. Sample data.',
    newBooking: 'New booking',
    views: {
      upcoming: 'Upcoming',
      stay: 'In stay',
      details: 'Needs details',
      pending: 'Waiting for payment',
      clash: 'Clashes',
      past: 'Past',
      cancelled: 'Cancelled',
    } satisfies Record<View, string>,
    allChannels: 'All channels',
    filter: 'Guest, phone, reference or unit',
    guest: 'Guest',
    unit: 'Unit',
    channel: 'Channel',
    dates: 'Dates',
    status: 'Status',
    amount: 'Amount',
    received: 'Received',
    fromChannel: (ch: string) => `Price in ${ch}`,
    empty: {
      upcoming: 'No upcoming bookings match.',
      stay: 'Nobody is staying right now.',
      details: 'Every booking has its guest details.',
      pending: 'No booking is waiting for payment.',
      clash: 'No clashes. Every night is booked once.',
      past: 'No past bookings match.',
      cancelled: 'No cancelled bookings match.',
    } satisfies Record<View, string>,
    more: (n: number) => `Show ${n} more`,
    count: (shown: number, total: number) => (shown < total ? `${shown} of ${total}` : `${total}`),
  },
  ar: {
    title: 'الحجوزات',
    sub: 'كل الحجوزات من كل القنوات في قائمة واحدة: Airbnb و Booking.com والموقع وواتساب والتليفون. بيانات تجريبية.',
    newBooking: 'حجز جديد',
    views: {
      upcoming: 'الجاية',
      stay: 'مقيمين',
      details: 'ناقص البيانات',
      pending: 'في انتظار الدفع',
      clash: 'تعارضات',
      past: 'اللي فاتت',
      cancelled: 'الملغية',
    } satisfies Record<View, string>,
    allChannels: 'كل القنوات',
    filter: 'ضيف، تليفون، رقم حجز أو وحدة',
    guest: 'الضيف',
    unit: 'الوحدة',
    channel: 'القناة',
    dates: 'التواريخ',
    status: 'الحالة',
    amount: 'المبلغ',
    received: 'وصل',
    fromChannel: (ch: string) => `السعر في ${ch}`,
    empty: {
      upcoming: 'مفيش حجوزات جاية بالبحث ده.',
      stay: 'مفيش حد مقيم دلوقتي.',
      details: 'كل الحجوزات بياناتها كاملة.',
      pending: 'مفيش حجز مستني الدفع.',
      clash: 'مفيش تعارضات. كل ليلة محجوزة مرة واحدة.',
      past: 'مفيش حجوزات فاتت بالبحث ده.',
      cancelled: 'مفيش حجوزات ملغية بالبحث ده.',
    } satisfies Record<View, string>,
    more: (n: number) => `اعرض ${n} كمان`,
    count: (shown: number, total: number) => (shown < total ? `${shown} من ${total}` : `${total}`),
  },
};

const PAGE = 60;
const views: View[] = ['upcoming', 'stay', 'details', 'pending', 'clash', 'past', 'cancelled'];

export function ReservationsScreen() {
  const lang = useLang();
  const t = useCopy(copy);
  const c = useCopy(common);
  const data = useData();
  const { setPanel, panel } = useDemo();
  const [view, setView] = useState<View>('upcoming');
  const [channel, setChannel] = useState<Channel | 'all'>('all');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);

  // The Today page links here with ?view=details; read it in the browser (the page is exported static).
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('view') as View | null;
    if (wanted && views.includes(wanted)) setView(wanted);
  }, []);

  const guests = useMemo(() => new Map(data.guests.map((g) => [g.id, g])), [data.guests]);
  const clash = useMemo(() => clashIds(data), [data]);

  const byView = useMemo(() => {
    const today = data.today;
    const test: Record<View, (r: Reservation) => boolean> = {
      upcoming: (r) => r.status !== 'cancelled' && r.checkIn >= today,
      stay: (r) => r.status !== 'cancelled' && r.checkIn < today && r.checkOut >= today,
      details: (r) => r.status !== 'cancelled' && !!r.needsDetails && r.checkOut > today,
      pending: (r) => r.status === 'pending',
      clash: (r) => clash.has(r.id),
      past: (r) => r.status !== 'cancelled' && r.checkOut < today,
      cancelled: (r) => r.status === 'cancelled' && r.checkOut >= today,
    };
    const out = {} as Record<View, Reservation[]>;
    for (const v of views) out[v] = data.reservations.filter(test[v]);
    return out;
  }, [data.reservations, data.today, clash]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    const list = byView[view].filter((r) => {
      if (channel !== 'all' && r.channel !== channel) return false;
      if (!q) return true;
      const g = r.guestId ? guests.get(r.guestId) : undefined;
      return (
        r.ref.toLowerCase().includes(q) ||
        r.unit.toLowerCase().includes(q) ||
        (g ? g.name.toLowerCase().includes(q) : false) ||
        (digits.length >= 3 && g ? g.phone.replace(/\D/g, '').includes(digits) : false)
      );
    });
    const past = view === 'past';
    return list.sort((a, b) => (past ? (a.checkOut < b.checkOut ? 1 : -1) : a.checkIn < b.checkIn ? -1 : a.checkIn > b.checkIn ? 1 : a.unit < b.unit ? -1 : 1));
  }, [byView, view, channel, query, guests]);

  useEffect(() => setLimit(PAGE), [view, channel, query]);

  const open = panel?.kind === 'reservation' ? panel.id : null;
  const shown = rows.slice(0, limit);

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

      <div className="sys-toolbar">
        <div className="sys-segment" role="group" aria-label={t.title}>
          {views.map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
              {t.views[v]}
              {v !== 'past' && v !== 'upcoming' ? <span className="n">{byView[v].length}</span> : null}
            </button>
          ))}
        </div>
      </div>
      <div className="sys-toolbar">
        <label className="sys-filter grow">
          <Search size={16} strokeWidth={1.75} aria-hidden="true" />
          <input className="sys-input" type="search" placeholder={t.filter} aria-label={t.filter} value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <select className="sys-select" style={{ inlineSize: 'auto', minBlockSize: '2.5rem', borderRadius: 999 }} value={channel} onChange={(e) => setChannel(e.target.value as Channel | 'all')} aria-label={t.channel}>
          <option value="all">{t.allChannels}</option>
          {(Object.keys(channelLabel) as Channel[]).map((ch) => (
            <option key={ch} value={ch}>
              {channelLabel[ch][lang]}
            </option>
          ))}
        </select>
        <span className="sys-muted sys-small">{t.count(shown.length, rows.length)}</span>
      </div>

      <section className="sys-panel">
        {rows.length ? (
          <div className="sys-table-wrap">
            <table className="sys-table">
              <thead>
                <tr>
                  <th scope="col">{t.guest}</th>
                  <th scope="col">{t.unit}</th>
                  <th scope="col">{t.dates}</th>
                  <th scope="col">{t.status}</th>
                  <th scope="col" className="end">
                    {t.amount}
                  </th>
                  <th scope="col" className="hide-medium">
                    {t.received}
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const g = r.guestId ? guests.get(r.guestId) : undefined;
                  const unit = unitByCode[r.unit];
                  const inClash = clash.has(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={inClash ? 'is-clash' : undefined}
                      aria-selected={open === r.id}
                      tabIndex={0}
                      onClick={() => setPanel({ kind: 'reservation', id: r.id })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setPanel({ kind: 'reservation', id: r.id });
                        }
                      }}
                    >
                      <td>
                        <span className="who">
                          <b>{g ? <bdi>{g.name}</bdi> : <span className="sys-muted">{c.needsDetails}</span>}</b>
                          <span>
                            {channelLabel[r.channel][lang]} · <Code>{r.ref}</Code>
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="who">
                          <b>
                            <Code>{unit.code}</Code>
                          </b>
                          <span>{compoundByCode[unit.compound].name[lang]}</span>
                        </span>
                      </td>
                      <td>
                        <span className="who">
                          <b>
                            <time>{stayRange(lang, r.checkIn, r.checkOut)}</time>
                          </b>
                          <span>{nightsText(lang, nightsOf(r))}</span>
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
                          <StatusBadge status={r.status} />
                          {inClash ? <Badge tone="bad">{c.clash}</Badge> : null}
                          {r.needsDetails ? <Badge tone="warn">{c.needsDetails}</Badge> : null}
                        </span>
                      </td>
                      <td className="end">
                        {r.total > 0 ? money(lang, r.total) : <span className="sys-muted sys-tiny">{t.fromChannel(channelLabel[r.channel][lang])}</span>}
                      </td>
                      <td className="hide-medium sys-muted">{day(lang, r.createdAt.slice(0, 10), { day: 'numeric', month: 'short' })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title={t.empty[view]} />
        )}
        {rows.length > shown.length ? (
          <div className="sys-panel__foot">
            <button type="button" className="sys-btn sys-btn--quiet" onClick={() => setLimit(limit + PAGE)}>
              {t.more(Math.min(PAGE, rows.length - shown.length))}
            </button>
          </div>
        ) : null}
      </section>
    </>
  );
}
