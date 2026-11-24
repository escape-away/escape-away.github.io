'use client';

import { ArrowRight, CalendarPlus, Check, Copy, ExternalLink, MessageCircle, RefreshCw, TriangleAlert, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { SlotImage } from '@/components/slot-image';
import { Link } from '@/i18n/navigation';
import { areaById, compoundByCode, ownerById, unitByCode } from '../catalog';
import { blockLabel, channelLabel, common, packageLabel, tx, useCopy, useLang } from '../copy';
import { addDays, monthOf, monthStart, addMonths } from '../dates';
import { ago, clock, day, guestsCount, money, nights as nightsText, pct, stayRange } from '../format';
import { clashPartner, moveTo, newId, nightsOf, takeDirect, twinFor } from '../ops';
import { clashIds, isFree, performance, unitStays } from '../select';
import { stayPrice } from '../seed';
import { useData, useDemo, useNow } from '../store';
import type { Reservation, Unit } from '../types';
import { Badge, ChannelChip, Code, StatusBadge } from './bits';

const copy = {
  en: {
    booking: 'Booking',
    unit: 'Unit',
    dates: 'Dates',
    party: 'Guests',
    channel: 'Channel',
    reference: 'Reference',
    received: 'Received',
    synced: 'Seen on the calendar link',
    total: 'Total',
    paid: 'Paid',
    balance: 'Still to pay',
    guest: 'Guest',
    phone: 'Phone',
    country: 'Country',
    language: 'Language',
    history: 'Earlier stays',
    first: 'First stay',
    missingTitle: 'Dates only, so far',
    missing: (ch: string) =>
      `${ch}'s calendar link carries the nights, not the guest. Copy the name, phone and price from the ${ch} app.`,
    name: 'Guest name',
    price: 'Total price (EGP)',
    save: 'Save details',
    clashTitle: 'Two bookings share these nights',
    clashText: (other: string) => `This booking overlaps ${other}. Both stay saved until the team moves a guest or cancels one booking.`,
    moveTo: (code: string) => `Move this guest to ${code}`,
    noTwin: 'No free twin unit for these nights. Call the guest with an alternative.',
    moved: (code: string) => `Moved to ${code}. The guest gets a WhatsApp message with the new address.`,
    message: 'Message on WhatsApp',
    messaged: 'In the real system this opens the guest’s WhatsApp chat.',
    cancel: 'Cancel booking',
    cancelAsk: 'Cancel this booking? The guest will be notified.',
    cancelYes: 'Yes, cancel it',
    keep: 'Keep it',
    cancelled: 'Booking cancelled. The nights are free again on every channel.',
    markPaid: 'Mark as paid',
    paidNow: 'Payment recorded. The booking is confirmed.',
    checkIn: 'Check in',
    checkedIn: 'Checked in.',
    checkOut: 'Check out',
    checkedOut: 'Checked out. The turnover clean is on the housekeeping app.',
    viewUnit: 'Open the unit',
    detailsSaved: 'Details saved. The booking is complete.',
    required: 'Needed',
    // Unit panel
    facts: 'The home',
    owner: 'Owner',
    plan: 'Contract',
    rate: 'Base rate',
    cleaning: 'Cleaning fee',
    occupancy: 'This month',
    links: 'Calendar links',
    import: (ch: string) => `Reads from ${ch}`,
    export: 'Our link, pasted into Airbnb and Booking.com',
    copyLink: 'Copy link',
    copied: 'Link copied.',
    failing: 'Not answering since',
    upcoming: 'Next stays',
    none: 'No stays booked yet.',
    onSite: 'See it on the website',
    bookUnit: 'Book this unit',
    perNight: 'a night',
    // New booking
    newTitle: 'New booking',
    newSub: 'For bookings taken on WhatsApp, by phone or at the desk.',
    pickUnit: 'Unit',
    from: 'Check-in',
    to: 'Check-out',
    via: 'Taken by',
    adults: 'Guests',
    payment: 'Payment',
    linkSent: 'Paymob link sent',
    paidAlready: 'Paid',
    autoPrice: 'From the unit’s rates',
    create: 'Save booking',
    taken: (code: string, what: string) => `These nights are taken on ${code} (${what}). Nothing was saved.`,
    tryInstead: 'Free for the same nights:',
    badDates: 'Check-out must be after check-in.',
    saved: (ref: string) => `Booking ${ref} saved. The team was asked to close the dates on Airbnb and Booking.com.`,
  },
  ar: {
    booking: 'الحجز',
    unit: 'الوحدة',
    dates: 'التواريخ',
    party: 'الضيوف',
    channel: 'القناة',
    reference: 'رقم الحجز',
    received: 'وصل',
    synced: 'ظهر في رابط التقويم',
    total: 'الإجمالي',
    paid: 'المدفوع',
    balance: 'الباقي',
    guest: 'الضيف',
    phone: 'التليفون',
    country: 'البلد',
    language: 'اللغة',
    history: 'إقامات سابقة',
    first: 'أول إقامة',
    missingTitle: 'التواريخ بس لحد دلوقتي',
    missing: (ch: string) => `رابط تقويم ${ch} بيجيب الليالي من غير بيانات الضيف. انقل الاسم والتليفون والسعر من تطبيق ${ch}.`,
    name: 'اسم الضيف',
    price: 'السعر الإجمالي (ج.م)',
    save: 'حفظ البيانات',
    clashTitle: 'حجزين على نفس الليالي',
    clashText: (other: string) => `الحجز ده متداخل مع ${other}. الحجزين محفوظين لحد ما الفريق ينقل ضيف أو يلغي حجز.`,
    moveTo: (code: string) => `انقل الضيف ده لـ ${code}`,
    noTwin: 'مفيش وحدة شبهها فاضية في الليالي دي. كلّم الضيف واعرض بديل.',
    moved: (code: string) => `اتنقل لـ ${code}. الضيف هيوصله رسالة واتساب بالعنوان الجديد.`,
    message: 'رسالة واتساب',
    messaged: 'في السيستم الحقيقي ده بيفتح شات الضيف على واتساب.',
    cancel: 'إلغاء الحجز',
    cancelAsk: 'إلغاء الحجز ده؟ هيوصل للضيف إشعار.',
    cancelYes: 'أيوه، الغيه',
    keep: 'سيبه',
    cancelled: 'الحجز اتلغى. الليالي رجعت فاضية على كل القنوات.',
    markPaid: 'تسجيل الدفع',
    paidNow: 'الدفع اتسجل والحجز اتأكد.',
    checkIn: 'تسجيل الوصول',
    checkedIn: 'تم تسجيل الوصول.',
    checkOut: 'تسجيل المغادرة',
    checkedOut: 'تم تسجيل المغادرة. التنظيف ظهر في تطبيق النضافة.',
    viewUnit: 'افتح الوحدة',
    detailsSaved: 'البيانات اتحفظت والحجز كامل.',
    required: 'مطلوب',
    facts: 'الوحدة',
    owner: 'المالك',
    plan: 'العقد',
    rate: 'السعر الأساسي',
    cleaning: 'رسوم التنظيف',
    occupancy: 'الشهر ده',
    links: 'روابط التقويم',
    import: (ch: string) => `بيقرأ من ${ch}`,
    export: 'رابطنا، متحط في Airbnb و Booking.com',
    copyLink: 'نسخ الرابط',
    copied: 'الرابط اتنسخ.',
    failing: 'مش بيرد من',
    upcoming: 'الإقامات الجاية',
    none: 'مفيش حجوزات لسه.',
    onSite: 'شوفها على الموقع',
    bookUnit: 'احجز الوحدة دي',
    perNight: 'في الليلة',
    newTitle: 'حجز جديد',
    newSub: 'للحجوزات اللي بتيجي على واتساب أو بالتليفون أو في المكتب.',
    pickUnit: 'الوحدة',
    from: 'الوصول',
    to: 'المغادرة',
    via: 'الحجز جه من',
    adults: 'عدد الضيوف',
    payment: 'الدفع',
    linkSent: 'لينك Paymob اتبعت',
    paidAlready: 'مدفوع',
    autoPrice: 'من أسعار الوحدة',
    create: 'حفظ الحجز',
    taken: (code: string, what: string) => `الليالي دي محجوزة على ${code} (${what}). محدش اتحفظ.`,
    tryInstead: 'فاضي في نفس الليالي:',
    badDates: 'المغادرة لازم تكون بعد الوصول.',
    saved: (ref: string) => `الحجز ${ref} اتحفظ. الفريق اتطلب منه يقفل التواريخ على Airbnb و Booking.com.`,
  },
};

function Drawer({ title, sub, children, foot, onClose }: { title: ReactNode; sub?: ReactNode; children: ReactNode; foot?: ReactNode; onClose: () => void }) {
  const c = useCopy(common);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  // Focus lands on the panel's heading once, when it opens (each panel remounts per record).
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <aside className="sys-drawer" role="dialog" aria-modal="false" aria-labelledby={titleId}>
      <header className="sys-drawer__head">
        <div style={{ display: 'grid', gap: 4, minInlineSize: 0 }}>
          <h2 id={titleId} ref={heading} tabIndex={-1}>
            {title}
          </h2>
          {sub ? <div className="sys-muted sys-small">{sub}</div> : null}
        </div>
        <button type="button" className="sys-btn sys-btn--quiet sys-btn--icon" aria-label={c.close} onClick={onClose}>
          <X size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </header>
      <div className="sys-drawer__body">{children}</div>
      {foot ? <footer className="sys-drawer__foot">{foot}</footer> : null}
    </aside>
  );
}

/* ---------- A booking ---------- */

function ReservationPanel({ id }: { id: string }) {
  const lang = useLang();
  const t = useCopy(copy);
  const c = useCopy(common);
  const data = useData();
  const now = useNow();
  const { dispatch, setPanel, toast } = useDemo();
  const res = data.reservations.find((r) => r.id === id);
  const [asking, setAsking] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', total: '' });
  const [tried, setTried] = useState(false);

  if (!res) return null;
  const unit = unitByCode[res.unit];
  const guest = res.guestId ? data.guests.find((g) => g.id === res.guestId) : undefined;
  const inClash = clashIds(data).has(res.id);
  const partner = inClash ? clashPartner(data, res) : undefined;
  const twin = inClash ? twinFor(data, res) : null;
  const n = nightsOf(res);
  const close = () => setPanel(null);
  const channelName = channelLabel[res.channel][lang];
  const ota = res.channel === 'airbnb' || res.channel === 'booking';

  const saveDetails = () => {
    setTried(true);
    if (!form.name.trim() || !form.phone.trim() || !(Number(form.total) > 0)) return;
    const guestId = newId('g');
    const total = Number(form.total);
    dispatch(
      { type: 'guest/add', guest: { id: guestId, name: form.name.trim(), phone: form.phone.trim(), country: 'EG', language: lang, pastStays: 0 } },
      { type: 'reservation/update', id: res.id, patch: { guestId, total, paid: total, needsDetails: false } },
    );
    toast({ en: copy.en.detailsSaved, ar: copy.ar.detailsSaved }, 'success');
  };

  const foot = asking ? (
    <>
      <span className="sys-small" style={{ flexBasis: '100%' }}>
        {t.cancelAsk}
      </span>
      <button
        type="button"
        className="sys-btn sys-btn--danger"
        onClick={() => {
          dispatch({ type: 'reservation/update', id: res.id, patch: { status: 'cancelled' } });
          toast({ en: copy.en.cancelled, ar: copy.ar.cancelled }, 'info');
          close();
        }}
      >
        {t.cancelYes}
      </button>
      <button type="button" className="sys-btn sys-btn--quiet" onClick={() => setAsking(false)}>
        {t.keep}
      </button>
    </>
  ) : (
    <>
      {res.status === 'pending' ? (
        <button
          type="button"
          className="sys-btn sys-btn--primary"
          onClick={() => {
            dispatch({ type: 'reservation/update', id: res.id, patch: { status: 'confirmed', paid: res.total } });
            toast({ en: copy.en.paidNow, ar: copy.ar.paidNow }, 'success');
          }}
        >
          {t.markPaid}
        </button>
      ) : null}
      {res.status === 'confirmed' && res.checkIn <= data.today ? (
        <button
          type="button"
          className="sys-btn sys-btn--primary"
          onClick={() => {
            dispatch({ type: 'reservation/update', id: res.id, patch: { status: 'checked-in' } });
            toast({ en: copy.en.checkedIn, ar: copy.ar.checkedIn }, 'success');
          }}
        >
          {t.checkIn}
        </button>
      ) : null}
      {res.status === 'checked-in' && res.checkOut <= data.today ? (
        <button
          type="button"
          className="sys-btn sys-btn--primary"
          onClick={() => {
            dispatch({ type: 'reservation/update', id: res.id, patch: { status: 'checked-out' } });
            toast({ en: copy.en.checkedOut, ar: copy.ar.checkedOut }, 'success');
          }}
        >
          {t.checkOut}
        </button>
      ) : null}
      {guest ? (
        <button type="button" className="sys-btn sys-btn--secondary" onClick={() => toast({ en: copy.en.messaged, ar: copy.ar.messaged }, 'info')}>
          <MessageCircle size={16} strokeWidth={1.75} aria-hidden="true" />
          {t.message}
        </button>
      ) : null}
      {res.status !== 'cancelled' && res.status !== 'checked-out' ? (
        <button type="button" className="sys-btn sys-btn--quiet push" onClick={() => setAsking(true)}>
          {t.cancel}
        </button>
      ) : null}
    </>
  );

  return (
    <Drawer
      onClose={close}
      title={guest ? <bdi>{guest.name}</bdi> : `${channelName} · ${c.needsDetails}`}
      sub={
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <StatusBadge status={res.status} />
          <ChannelChip channel={res.channel} />
          {inClash ? <Badge tone="bad">{c.clash}</Badge> : null}
          {res.needsDetails ? <Badge tone="warn">{c.needsDetails}</Badge> : null}
        </span>
      }
      foot={foot}
    >
      {inClash ? (
        <div className="sys-note" data-tone="bad">
          <p>
            <b>{t.clashTitle}.</b> {partner ? t.clashText(partner.ref) : null}
          </p>
          <div style={{ marginBlockStart: 10 }}>
            {twin ? (
              <button
                type="button"
                className="sys-btn sys-btn--primary sys-btn--small"
                onClick={() => {
                  dispatch(...moveTo(res, twin.code));
                  toast({ en: copy.en.moved(twin.code), ar: copy.ar.moved(twin.code) }, 'success');
                }}
              >
                {t.moveTo(twin.code)}
                <ArrowRight size={15} strokeWidth={1.75} aria-hidden="true" className="flip-rtl" />
              </button>
            ) : (
              <span className="sys-small">{t.noTwin}</span>
            )}
          </div>
        </div>
      ) : null}

      {res.needsDetails ? (
        <section className="sys-section">
          <div className="sys-note" data-tone="warn">
            <p>
              <b>{t.missingTitle}.</b> {t.missing(channelName)}
            </p>
          </div>
          <form
            className="sys-form"
            onSubmit={(e) => {
              e.preventDefault();
              saveDetails();
            }}
          >
            <label className="sys-field">
              <span>{t.name}</span>
              <input className="sys-input" value={form.name} aria-invalid={tried && !form.name.trim()} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="off" />
            </label>
            <div className="sys-form__row">
              <label className="sys-field">
                <span>{t.phone}</span>
                <input className="sys-input ltr" dir="ltr" inputMode="tel" value={form.phone} aria-invalid={tried && !form.phone.trim()} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+20 10 …" />
              </label>
              <label className="sys-field">
                <span>{t.price}</span>
                <input className="sys-input ltr" dir="ltr" inputMode="numeric" value={form.total} aria-invalid={tried && !(Number(form.total) > 0)} onChange={(e) => setForm({ ...form, total: e.target.value.replace(/[^\d]/g, '') })} placeholder={String(stayPrice(unit, res.checkIn, res.checkOut))} />
              </label>
            </div>
            <div>
              <button type="submit" className="sys-btn sys-btn--primary">
                <Check size={16} strokeWidth={1.75} aria-hidden="true" />
                {t.save}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="sys-section">
        <h3>{t.booking}</h3>
        <dl className="sys-dl">
          <dt>{t.unit}</dt>
          <dd>
            {/* The code on its own line with the home's name under it, so a long name wraps at full width. */}
            <button type="button" className="sys-unit-link" onClick={() => setPanel({ kind: 'unit', code: unit.code })}>
              <Code>{unit.code}</Code>
              <span>{unit.name[lang]}</span>
            </button>
          </dd>
          <dt>{t.dates}</dt>
          <dd>
            <time>{stayRange(lang, res.checkIn, res.checkOut)}</time> · {nightsText(lang, n)}
          </dd>
          <dt>{t.party}</dt>
          <dd>{guestsCount(lang, res.adults)}</dd>
          <dt>{t.reference}</dt>
          <dd>
            <Code>{res.ref}</Code>
          </dd>
          <dt>{t.received}</dt>
          <dd>
            {day(lang, res.createdAt.slice(0, 10))}
            {lang === 'ar' ? '، ' : ', '}
            {clock(lang, res.createdAt)}
          </dd>
          {ota && res.syncedAt ? (
            <>
              <dt>{t.synced}</dt>
              <dd>{ago(lang, res.syncedAt, now)}</dd>
            </>
          ) : null}
          {res.total > 0 ? (
            <>
              <dt>{t.total}</dt>
              <dd className="num">{money(lang, res.total)}</dd>
              <dt>{t.paid}</dt>
              <dd className="num">{money(lang, res.paid)}</dd>
              {res.total - res.paid > 0 ? (
                <>
                  <dt>{t.balance}</dt>
                  <dd className="num">{money(lang, res.total - res.paid)}</dd>
                </>
              ) : null}
            </>
          ) : null}
        </dl>
      </section>

      {guest ? (
        <section className="sys-section">
          <h3>{t.guest}</h3>
          <dl className="sys-dl">
            <dt>{t.phone}</dt>
            <dd>
              <span className="ltr">{guest.phone}</span>
            </dd>
            <dt>{t.country}</dt>
            <dd>{new Intl.DisplayNames([lang === 'ar' ? 'ar-EG' : 'en'], { type: 'region' }).of(guest.country)}</dd>
            <dt>{t.language}</dt>
            <dd>{guest.language === 'ar' ? (lang === 'ar' ? 'العربية' : 'Arabic') : lang === 'ar' ? 'الإنجليزية' : 'English'}</dd>
            <dt>{t.history}</dt>
            <dd>
              {guest.pastStays ? (
                <Badge tone="info" plain>
                  {guest.pastStays}×
                </Badge>
              ) : (
                t.first
              )}
            </dd>
          </dl>
        </section>
      ) : null}
    </Drawer>
  );
}

/* ---------- A unit ---------- */

function UnitPanel({ code }: { code: string }) {
  const lang = useLang();
  const t = useCopy(copy);
  const data = useData();
  const now = useNow();
  const { setPanel, toast } = useDemo();
  const unit = unitByCode[code];
  const owner = ownerById[unit.ownerId];
  const month = monthOf(data.today);
  const perf = useMemo(() => performance(data, monthStart(month), monthStart(addMonths(month, 1)), new Set([code])), [data, month, code]);
  const next = unitStays(data, code)
    .filter((r) => r.checkOut > data.today)
    .slice(0, 4);
  const feeds = data.feeds.filter((f) => f.unit === code);
  const guests = new Map(data.guests.map((g) => [g.id, g]));
  const exportLink = `…/ical/${code.toLowerCase()}.ics`;

  return (
    <Drawer
      onClose={() => setPanel(null)}
      title={<Code>{unit.code}</Code>}
      sub={unit.name[lang]}
      foot={
        <>
          <button type="button" className="sys-btn sys-btn--primary" onClick={() => setPanel({ kind: 'new', unit: unit.code })}>
            <CalendarPlus size={16} strokeWidth={1.75} aria-hidden="true" />
            {t.bookUnit}
          </button>
          {unit.slug ? (
            <Link href={`/stays/${unit.slug}`} className="sys-btn sys-btn--quiet push">
              {t.onSite}
              <ExternalLink size={15} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          ) : null}
        </>
      }
    >
      {unit.photo ? (
        <div className="soft-arch" style={{ aspectRatio: '16 / 9' }}>
          <SlotImage slot={unit.photo} alt={unit.name[lang]} width={960} height={540} sizes="480px" />
        </div>
      ) : null}
      <section className="sys-section">
        <h3>{t.facts}</h3>
        <dl className="sys-dl">
          <dt>{lang === 'ar' ? 'المكان' : 'Where'}</dt>
          <dd>
            {compoundByCode[unit.compound].name[lang]} · {areaById[unit.area].name[lang]}
          </dd>
          <dt>{lang === 'ar' ? 'المساحة' : 'Sleeps'}</dt>
          <dd>
            {guestsCount(lang, unit.guests)} · {unit.bedrooms ? `${unit.bedrooms} ${lang === 'ar' ? 'غرف نوم' : 'bedrooms'}` : lang === 'ar' ? 'استوديو' : 'Studio'} ·{' '}
            {unit.baths} {lang === 'ar' ? 'حمام' : unit.baths === 1 ? 'bath' : 'baths'}
          </dd>
          <dt>{t.owner}</dt>
          <dd>{owner.name[lang]}</dd>
          <dt>{t.plan}</dt>
          <dd>
            {packageLabel[owner.package][lang]} · {pct(lang, owner.commission)}
          </dd>
          <dt>{t.rate}</dt>
          <dd className="num">
            {money(lang, unit.rate)} {t.perNight}
          </dd>
          <dt>{t.cleaning}</dt>
          <dd className="num">{money(lang, unit.cleaningFee)}</dd>
          <dt>{t.occupancy}</dt>
          <dd className="num">
            {pct(lang, perf.occupancy)} · {money(lang, perf.revenue)}
          </dd>
        </dl>
      </section>
      <section className="sys-section">
        <h3>{t.links}</h3>
        <ul className="sys-list sys-small">
          {feeds.map((f) => (
            <li key={f.channel} style={{ display: 'flex', gap: 8, alignItems: 'center', paddingBlock: 8 }}>
              {f.ok ? <RefreshCw size={15} strokeWidth={1.75} aria-hidden="true" /> : <TriangleAlert size={15} strokeWidth={1.75} aria-hidden="true" color="var(--bad)" />}
              <span>{t.import(f.channel === 'airbnb' ? 'Airbnb' : 'Booking.com')}</span>
              <span className="sys-muted" style={{ marginInlineStart: 'auto' }}>
                {f.ok ? ago(lang, f.lastSync, now) : `${t.failing} ${clock(lang, f.lastSync)}`}
              </span>
            </li>
          ))}
          <li style={{ display: 'grid', gap: 6, paddingBlock: 8 }}>
            <span>{t.export}</span>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <code className="sys-code sys-muted sys-tiny" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {exportLink}
              </code>
              <button type="button" className="sys-btn sys-btn--quiet sys-btn--small" onClick={() => toast({ en: copy.en.copied, ar: copy.ar.copied }, 'success')}>
                <Copy size={14} strokeWidth={1.75} aria-hidden="true" />
                {t.copyLink}
              </button>
            </span>
          </li>
        </ul>
      </section>
      <section className="sys-section">
        <h3>{t.upcoming}</h3>
        {next.length ? (
          <ul className="sys-list">
            {next.map((r) => {
              const g = r.guestId ? guests.get(r.guestId) : undefined;
              return (
                <li key={r.id}>
                  <button type="button" className="sys-row" style={{ paddingInline: 0 }} onClick={() => setPanel({ kind: 'reservation', id: r.id })}>
                    <ChannelChip channel={r.channel} />
                    <span className="sys-row__main">
                      <b>{g ? <bdi>{g.name}</bdi> : <span className="sys-muted">{copy[lang].missingTitle}</span>}</b>
                      <span>
                        {stayRange(lang, r.checkIn, r.checkOut)} · {nightsText(lang, nightsOf(r))}
                      </span>
                    </span>
                    <StatusBadge status={r.status} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="sys-muted sys-small">{t.none}</p>
        )}
      </section>
    </Drawer>
  );
}

/* ---------- A new direct booking ---------- */

function NewBookingPanel({ unit: initialUnit, checkIn: initialIn }: { unit?: string; checkIn?: string }) {
  const lang = useLang();
  const t = useCopy(copy);
  const data = useData();
  const { dispatch, setPanel, toast, setFocus } = useDemo();
  const start = initialIn ?? addDays(data.today, 7);
  const [form, setForm] = useState({
    unit: initialUnit ?? data.units[0].code,
    checkIn: start,
    checkOut: addDays(start, 3),
    channel: 'whatsapp' as 'whatsapp' | 'phone' | 'direct',
    name: '',
    phone: '',
    adults: 2,
    paid: false,
  });
  const [error, setError] = useState<ReactNode>(null);
  const [tried, setTried] = useState(false);
  const unit = unitByCode[form.unit] as Unit;
  const validDates = form.checkOut > form.checkIn;
  const price = validDates ? stayPrice(unit, form.checkIn, form.checkOut) : 0;

  const alternatives = useMemo(() => {
    if (!validDates) return [];
    return data.units
      .filter((u) => u.code !== unit.code && u.area === unit.area && u.bedrooms >= unit.bedrooms && isFree(data, u.code, form.checkIn, form.checkOut))
      .slice(0, 3);
  }, [data, unit, form.checkIn, form.checkOut, validDates]);

  const submit = () => {
    setTried(true);
    setError(null);
    if (!validDates) {
      setError(t.badDates);
      return;
    }
    if (!form.name.trim() || !form.phone.trim()) return;
    const result = takeDirect(data, {
      unit: form.unit,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      channel: form.channel,
      name: form.name.trim(),
      phone: form.phone.trim(),
      adults: form.adults,
      paid: form.paid,
    });
    if (!result.ok) {
      const clash = data.reservations.find(
        (r) => r.unit === form.unit && r.status !== 'cancelled' && r.checkIn < form.checkOut && form.checkIn < r.checkOut,
      );
      const block = data.blocks.find((b) => b.unit === form.unit && b.start < form.checkOut && form.checkIn < b.end);
      const what = clash
        ? `${channelLabel[clash.channel][lang]}, ${stayRange(lang, clash.checkIn, clash.checkOut)}`
        : block
          ? `${tx(blockLabel[block.reason], lang)}, ${stayRange(lang, block.start, block.end)}`
          : '';
      setError(t.taken(form.unit, what));
      return;
    }
    dispatch(...result.actions);
    toast({ en: copy.en.saved(result.reservation.ref), ar: copy.ar.saved(result.reservation.ref) }, 'success');
    setFocus(result.reservation.id);
    setPanel({ kind: 'reservation', id: result.reservation.id });
  };

  return (
    <Drawer
      onClose={() => setPanel(null)}
      title={t.newTitle}
      sub={t.newSub}
      foot={
        <button type="button" className="sys-btn sys-btn--primary" onClick={submit}>
          {t.create}
        </button>
      }
    >
      <form
        className="sys-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="sys-field">
          <span>{t.pickUnit}</span>
          <select className="sys-select" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            {data.units.map((u) => (
              <option key={u.code} value={u.code}>
                {u.code} · {u.name[lang]}
              </option>
            ))}
          </select>
        </label>
        <div className="sys-form__row">
          <label className="sys-field">
            <span>{t.from}</span>
            <input className="sys-input" type="date" value={form.checkIn} min={data.today} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} />
          </label>
          <label className="sys-field">
            <span>{t.to}</span>
            <input className="sys-input" type="date" value={form.checkOut} min={form.checkIn} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} />
          </label>
        </div>
        {error ? (
          <div className="sys-note" data-tone="bad" role="alert">
            <p>{error}</p>
            {alternatives.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBlockStart: 8, alignItems: 'center' }}>
                <span className="sys-tiny">{t.tryInstead}</span>
                {alternatives.map((u) => (
                  <button key={u.code} type="button" className="sys-btn sys-btn--secondary sys-btn--small" onClick={() => { setForm({ ...form, unit: u.code }); setError(null); }}>
                    <Code>{u.code}</Code>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <fieldset className="sys-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <span>{t.via}</span>
          <div className="sys-segment" role="group">
            {(['whatsapp', 'phone', 'direct'] as const).map((ch) => (
              <button key={ch} type="button" aria-pressed={form.channel === ch} onClick={() => setForm({ ...form, channel: ch })}>
                {channelLabel[ch][lang]}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="sys-field">
          <span>{t.name}</span>
          <input className="sys-input" value={form.name} aria-invalid={tried && !form.name.trim()} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="off" />
        </label>
        <div className="sys-form__row">
          <label className="sys-field">
            <span>{t.phone}</span>
            <input className="sys-input ltr" dir="ltr" inputMode="tel" value={form.phone} aria-invalid={tried && !form.phone.trim()} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+20 10 …" />
          </label>
          <label className="sys-field">
            <span>{t.adults}</span>
            <input className="sys-input" type="number" min={1} max={unit.guests} value={form.adults} onChange={(e) => setForm({ ...form, adults: Math.max(1, Math.min(unit.guests, Number(e.target.value) || 1)) })} />
          </label>
        </div>
        <fieldset className="sys-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <span>{t.payment}</span>
          <div className="sys-segment" role="group">
            <button type="button" aria-pressed={!form.paid} onClick={() => setForm({ ...form, paid: false })}>
              {t.linkSent}
            </button>
            <button type="button" aria-pressed={form.paid} onClick={() => setForm({ ...form, paid: true })}>
              {t.paidAlready}
            </button>
          </div>
        </fieldset>
        {validDates ? (
          <div className="sys-note">
            <p>
              <b className="num">{money(lang, price)}</b> · {nightsText(lang, nightsOf(form))} · <span className="sys-muted">{t.autoPrice}</span>
            </p>
          </div>
        ) : null}
      </form>
    </Drawer>
  );
}

export function PanelHost() {
  const { panel } = useDemo();
  // While a side panel is open, toasts step aside so they never cover its buttons.
  useEffect(() => {
    const root = document.documentElement;
    if (panel) root.dataset.sysPanel = 'open';
    else delete root.dataset.sysPanel;
    return () => {
      delete root.dataset.sysPanel;
    };
  }, [panel]);
  if (!panel) return null;
  if (panel.kind === 'reservation') return <ReservationPanel key={panel.id} id={panel.id} />;
  if (panel.kind === 'unit') return <UnitPanel key={panel.code} code={panel.code} />;
  return <NewBookingPanel key={`${panel.unit ?? ''}${panel.checkIn ?? ''}`} unit={panel.unit} checkIn={panel.checkIn} />;
}

export type { Reservation };
