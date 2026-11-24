'use client';

import '@/styles/system-apps.css';
import { ArrowLeft, CalendarX, UserRound } from 'lucide-react';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { EaMark } from '@/components/ea-mark';
import { LanguageSwitch } from '@/components/language-switch';
import { SlotImage } from '@/components/slot-image';
import { Link } from '@/i18n/navigation';
import { areaById, compoundByCode, ownerById } from '../catalog';
import { blockLabel, channelLabel, packageLabel, useCopy, useLang } from '../copy';
import { addDays, addMonths, diffDays, monthOf, monthStart, overlaps } from '../dates';
import { day, money, monthName, nights as nightsText, num, pct, stayRange } from '../format';
import { newId } from '../ops';
import { freeFrom, isFree, live, performance, statement, unitStays } from '../select';
import { useDemo } from '../store';
import type { Block, DemoData, Owner, Payout, Reservation, TeamAlert, Unit } from '../types';
import { Badge, ChannelChip, Code, type Tone } from '../ui/bits';

/** The portal's sample owner: Nadia lives in Dubai and owns the Marassi chalet and the Alamein Towers apartment. */
const OWNER = 'nadia';

const copy = {
  en: {
    portal: 'Owner portal',
    back: 'Back to the system',
    hello: (name: ReactNode) => <>Hello, {name}</>,
    sub: (month: string) => `Your homes in ${month}: who’s staying, what they earn and what’s next.`,
    thisMonth: 'This month',
    nightsBooked: 'Nights booked',
    revenue: 'Room revenue',
    payoutEst: 'Estimated payout',
    monthNote: (date: string) => `Estimated until the month closes. The statement is final on ${date}.`,
    homes: 'Your homes',
    booked: (month: string) => `Booked in ${month}`,
    stayingNow: 'Staying now',
    until: (date: string) => `Guests until ${date}`,
    nextStay: 'Next stay',
    noStays: 'Nothing booked yet',
    comingUp: 'Coming up',
    privacy: 'Guests show by first name only.',
    yourStay: 'Your stay',
    guestOf: (channel: string) => (
      <>
        <bdi>{channel}</bdi> guest
      </>
    ),
    now: 'Staying now',
    nothingComing: 'Nothing booked yet. New stays show up here.',
    statements: 'Statements',
    terms: (plan: string, fee: string, to: string) => `${plan}: our fee is ${fee} of net room revenue, paid out to ${to}.`,
    payTo: { bank: 'your bank account', wallet: 'your mobile wallet' },
    status: { draft: 'In progress', approved: 'Approved', paid: 'Paid' } satisfies Record<Payout['status'], string>,
    payout: 'Payout',
    estimated: 'Estimated payout',
    view: 'View',
    hide: 'Hide',
    viewLabel: (month: string) => `View the statement for ${month}`,
    hideLabel: (month: string) => `Hide the statement for ${month}`,
    lineFee: (channel: string, amount: string) => (
      <>
        <bdi>{channel}</bdi> fee {amount}
      </>
    ),
    cardFee: (amount: string) => (
      <>
        <bdi>Paymob</bdi> card fee {amount}
      </>
    ),
    noLines: 'No stays this month.',
    gross: 'Room revenue',
    fees: 'Channel and card fees',
    net: 'Net revenue',
    commission: (share: string) => `Management fee (${share})`,
    upkeep: 'Upkeep',
    upkeepHint: 'consumables and small repairs',
    block: 'Block dates for your own stay',
    blockSub: 'Staying in one of your homes? Close the dates here and nobody else can book them.',
    home: 'Home',
    arrive: 'Arriving',
    leave: 'Leaving',
    blockButton: 'Block these dates',
    pickDates: 'Pick both dates.',
    badDates: 'The leaving day must be after the arriving day.',
    past: 'The dates must start today or later.',
    takenStay: (code: string, range: string, channel: string) => (
      <>
        <Code>{code}</Code> is booked {range} through <bdi>{channel}</bdi>, so those dates aren’t free.
      </>
    ),
    takenOwn: (code: string, range: string) => (
      <>
        You already blocked {range} on <Code>{code}</Code>.
      </>
    ),
    takenFix: (code: string, range: string) => (
      <>
        <Code>{code}</Code> is closed for maintenance {range}.
      </>
    ),
    blocked: 'Blocked. The dates are closed on the website, Airbnb and Booking.com.',
    teamAlert: (name: string, code: string, range: string) =>
      `Owner stay on ${code} for ${range} (${name}). Close those nights on Airbnb and Booking.com.`,
    sample: 'Sample owner: every name and number here is made up.',
    loading: 'Loading your homes…',
  },
  ar: {
    portal: 'بوابة الملاك',
    back: 'ارجع للسيستم',
    hello: (name: ReactNode) => <>أهلًا يا {name}</>,
    sub: (month: string) => `وحداتك في ${month}: مين نازل فيها، بتكسب قد إيه، وإيه اللي جاي.`,
    thisMonth: 'الشهر ده',
    nightsBooked: 'ليالي محجوزة',
    revenue: 'إيراد الإقامات',
    payoutEst: 'التحويل المتوقع',
    monthNote: (date: string) => `رقم متوقع لحد ما الشهر يقفل. الكشف النهائي بيطلع يوم ${date}.`,
    homes: 'وحداتك',
    booked: (month: string) => `محجوز في ${month}`,
    stayingNow: 'فيها ضيوف دلوقتي',
    until: (date: string) => `لحد ${date}`,
    nextStay: 'الإقامة الجاية',
    noStays: 'لسه مفيش حجوزات',
    comingUp: 'اللي جاي',
    privacy: 'بنعرض الاسم الأول بس لكل ضيف.',
    yourStay: 'إقامتك',
    guestOf: (channel: string) => (
      <>
        ضيف <bdi>{channel}</bdi>
      </>
    ),
    now: 'موجودين دلوقتي',
    nothingComing: 'لسه مفيش حجوزات. الإقامات الجديدة هتظهر هنا.',
    statements: 'كشوف الحساب',
    terms: (plan: string, fee: string, to: string) => `${plan}: عمولتنا ${fee} من صافي إيراد الإقامات، والتحويل على ${to}.`,
    payTo: { bank: 'حسابك في البنك', wallet: 'محفظتك الإلكترونية' },
    status: { draft: 'لسه بيتحسب', approved: 'اتعتمد', paid: 'اتحوّل' } satisfies Record<Payout['status'], string>,
    payout: 'التحويل',
    estimated: 'التحويل المتوقع',
    view: 'عرض',
    hide: 'إخفاء',
    viewLabel: (month: string) => `عرض كشف ${month}`,
    hideLabel: (month: string) => `إخفاء كشف ${month}`,
    lineFee: (channel: string, amount: string) => (
      <>
        عمولة <bdi>{channel}</bdi> {amount}
      </>
    ),
    cardFee: (amount: string) => (
      <>
        رسوم <bdi>Paymob</bdi> {amount}
      </>
    ),
    noLines: 'مفيش إقامات في الشهر ده.',
    gross: 'إيراد الإقامات',
    fees: 'عمولة القنوات والدفع',
    net: 'صافي الإيراد',
    commission: (share: string) => `عمولة الإدارة (${share})`,
    upkeep: 'الصيانة',
    upkeepHint: 'المستلزمات والتصليحات الصغيرة',
    block: 'اقفل تواريخ لإقامتك',
    blockSub: 'هتقضي كام يوم في وحدتك؟ اقفل التواريخ من هنا ومحدش غيرك هيقدر يحجزها.',
    home: 'الوحدة',
    arrive: 'الوصول',
    leave: 'المغادرة',
    blockButton: 'اقفل التواريخ دي',
    pickDates: 'محتاجين يوم الوصول ويوم المغادرة.',
    badDates: 'يوم المغادرة لازم يكون بعد يوم الوصول.',
    past: 'التواريخ لازم تبدأ من النهاردة أو بعد كده.',
    takenStay: (code: string, range: string, channel: string) => (
      <>
        <Code>{code}</Code> محجوزة {range} عن طريق <bdi>{channel}</bdi>، فالتواريخ دي مش متاحة.
      </>
    ),
    takenOwn: (code: string, range: string) => (
      <>
        {range} مقفولة بالفعل لإقامتك على <Code>{code}</Code>.
      </>
    ),
    takenFix: (code: string, range: string) => (
      <>
        <Code>{code}</Code> مقفولة للصيانة {range}.
      </>
    ),
    blocked: 'اتقفلت. التواريخ دي مقفولة دلوقتي على الموقع و Airbnb و Booking.com.',
    teamAlert: (name: string, code: string, range: string) =>
      `إقامة مالك على ${code} من ${range} (${name}). اقفل الليالي دي على Airbnb و Booking.com.`,
    sample: 'حساب مالك تجريبي: كل الأسماء والأرقام هنا متألفة.',
    loading: 'بنجهّز وحداتك…',
  },
};

const payoutTone: Record<Payout['status'], Tone> = { draft: 'done', approved: 'info', paid: 'ok' };

type Statement = ReturnType<typeof statement>;
type Upcoming = { id: string; unit: string; start: string; end: string; res?: Reservation; block?: Block };

function PortalTop() {
  const lang = useLang();
  const t = useCopy(copy);
  const owner = ownerById[OWNER];
  return (
    <header className="portal-top">
      <div className="portal-top__inner">
        <span className="portal-brand">
          <EaMark />
          <b>{t.portal}</b>
        </span>
        <div className="portal-top__end">
          <span className="portal-top__who portal-hide-narrow">
            <UserRound size={16} strokeWidth={1.75} aria-hidden="true" />
            <bdi>{owner.name[lang]}</bdi>
          </span>
          <LanguageSwitch text={lang === 'en' ? 'العربية' : 'English'} className="sys-btn sys-btn--quiet" />
          <Link href="/admin" className="sys-btn sys-btn--quiet" aria-label={t.back}>
            <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" className="flip-rtl" />
            <span className="portal-hide-narrow">{t.back}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function HomeCard({ unit, data, month }: { unit: Unit; data: DemoData; month: string }) {
  const lang = useLang();
  const t = useCopy(copy);
  const perf = performance(data, monthStart(month), monthStart(addMonths(month, 1)), new Set([unit.code]));
  const ahead = unitStays(data, unit.code).filter((r) => r.checkOut > data.today);
  const current = ahead.find((r) => r.checkIn <= data.today);
  const next = ahead.find((r) => r.checkIn > data.today);
  return (
    <article className="sys-panel portal-home">
      {unit.photo ? (
        <div className="soft-arch portal-home__photo">
          {/* The home's name is the heading right under it, so the photo needs no words of its own. */}
          <SlotImage slot={unit.photo} alt="" width={960} height={600} sizes="(max-width: 40rem) calc(100vw - 4rem), 27rem" />
        </div>
      ) : null}
      <div className="portal-home__body">
        <h3>{unit.name[lang]}</h3>
        <p className="sys-muted sys-small">
          {compoundByCode[unit.compound].name[lang]} · {areaById[unit.area].name[lang]} · <Code>{unit.code}</Code>
        </p>
        <dl className="sys-dl">
          <dt>{t.booked(monthName(lang, month, false))}</dt>
          <dd className="num">{pct(lang, perf.occupancy)}</dd>
          {current ? (
            <>
              <dt>{t.stayingNow}</dt>
              <dd>{t.until(day(lang, current.checkOut))}</dd>
            </>
          ) : null}
          <dt>{t.nextStay}</dt>
          <dd className="num">{next ? stayRange(lang, next.checkIn, next.checkOut) : t.noStays}</dd>
        </dl>
      </div>
    </article>
  );
}

function StatementDetail({ id, s, owner, draft }: { id: string; s: Statement; owner: Owner; draft: boolean }) {
  const lang = useLang();
  const t = useCopy(copy);
  return (
    <div id={id} className="sys-statement portal-statement__detail">
      {s.lines.length ? (
        <ul className="portal-lines">
          {s.lines.map((line) => (
            <li key={line.res.id}>
              <div className="portal-lines__main">
                <b className="num">{stayRange(lang, line.res.checkIn, line.res.checkOut)}</b>
                <span className="sys-muted sys-tiny">
                  <Code>{line.res.unit}</Code> · <bdi>{channelLabel[line.res.channel][lang]}</bdi> · {nightsText(lang, line.nights)}
                </span>
              </div>
              <div className="portal-lines__end">
                <span className="num">{money(lang, line.gross)}</span>
                <span className="sys-muted sys-tiny">
                  {/* Airbnb and Booking.com keep their own cut; our own bookings pay Paymob's card fee. */}
                  {line.res.channel === 'airbnb' || line.res.channel === 'booking'
                    ? t.lineFee(channelLabel[line.res.channel][lang], money(lang, line.fee))
                    : t.cardFee(money(lang, line.fee))}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sys-muted sys-small">{t.noLines}</p>
      )}
      <dl className="sys-statement__total">
        <dt>{t.gross}</dt>
        <dd className="end">{money(lang, s.gross)}</dd>
        <dt>{t.fees}</dt>
        <dd className="end">{money(lang, s.fees)}</dd>
        <dt>{t.net}</dt>
        <dd className="end">{money(lang, s.net)}</dd>
        <dt>{t.commission(pct(lang, owner.commission))}</dt>
        <dd className="end">{money(lang, s.commission)}</dd>
        <dt>
          {t.upkeep} <span className="sys-muted sys-tiny">· {t.upkeepHint}</span>
        </dt>
        <dd className="end">{money(lang, s.upkeep)}</dd>
        <dt className="sum">{draft ? t.estimated : t.payout}</dt>
        <dd className="sum end">{money(lang, s.payout)}</dd>
      </dl>
    </div>
  );
}

function BlockForm({ data, homes, owner, titleId }: { data: DemoData; homes: Unit[]; owner: Owner; titleId: string }) {
  const lang = useLang();
  const t = useCopy(copy);
  const { dispatch, toast } = useDemo();
  const errorId = useId();
  // Opens on the first free four nights three weeks out, so the first try shows the happy path.
  const [form, setForm] = useState(() => {
    const unit = homes[0]?.code ?? '';
    const from = (unit && freeFrom(data, unit, addDays(data.today, 21), 4)) || addDays(data.today, 21);
    return { unit, from, to: addDays(from, 4) };
  });
  const [error, setError] = useState<ReactNode>(null);

  const submit = () => {
    setError(null);
    const { unit, from, to } = form;
    if (!from || !to) {
      setError(t.pickDates);
      return;
    }
    if (to <= from) {
      setError(t.badDates);
      return;
    }
    if (from < data.today) {
      setError(t.past);
      return;
    }
    if (!isFree(data, unit, from, to)) {
      const stay = live(data).find((r) => r.unit === unit && overlaps(r.checkIn, r.checkOut, from, to));
      const held = data.blocks.find((b) => b.unit === unit && overlaps(b.start, b.end, from, to));
      if (stay) setError(t.takenStay(unit, stayRange(lang, stay.checkIn, stay.checkOut), channelLabel[stay.channel][lang]));
      else if (held) setError((held.reason === 'owner' ? t.takenOwn : t.takenFix)(unit, stayRange(lang, held.start, held.end)));
      return;
    }
    const block: Block = { id: newId('b'), unit, start: from, end: to, reason: 'owner' };
    // Until the channel manager is connected, the team still closes those nights on Airbnb and Booking.com.
    const alert: TeamAlert = {
      id: newId('a'),
      at: new Date().toISOString(),
      kind: 'block',
      text: {
        en: copy.en.teamAlert(owner.name.en, unit, stayRange('en', from, to)),
        ar: copy.ar.teamAlert(owner.name.ar, unit, stayRange('ar', from, to)),
      },
    };
    dispatch({ type: 'block/add', block }, { type: 'alert/add', alert });
    toast({ en: copy.en.blocked, ar: copy.ar.blocked }, 'success');
  };

  return (
    <form
      className="sys-panel"
      aria-labelledby={titleId}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="sys-panel__body sys-form">
        <label className="sys-field">
          <span>{t.home}</span>
          <select
            className="sys-select"
            value={form.unit}
            onChange={(e) => {
              setError(null);
              setForm({ ...form, unit: e.target.value });
            }}
          >
            {homes.map((u) => (
              <option key={u.code} value={u.code}>
                {u.code} · {u.name[lang]}
              </option>
            ))}
          </select>
        </label>
        <div className="sys-form__row">
          <label className="sys-field">
            <span>{t.arrive}</span>
            <input
              className="sys-input"
              type="date"
              value={form.from}
              min={data.today}
              aria-describedby={error ? errorId : undefined}
              onChange={(e) => {
                const from = e.target.value;
                setError(null);
                setForm((f) => {
                  const length = Math.max(1, diffDays(f.from, f.to) || 1);
                  return { ...f, from, to: from && f.to <= from ? addDays(from, length) : f.to };
                });
              }}
            />
          </label>
          <label className="sys-field">
            <span>{t.leave}</span>
            <input
              className="sys-input"
              type="date"
              value={form.to}
              min={form.from ? addDays(form.from, 1) : data.today}
              aria-describedby={error ? errorId : undefined}
              onChange={(e) => {
                setError(null);
                setForm({ ...form, to: e.target.value });
              }}
            />
          </label>
        </div>
        {error ? (
          <div className="sys-note" data-tone="bad" role="alert" id={errorId}>
            <p>{error}</p>
          </div>
        ) : null}
        <div>
          <button type="submit" className="sys-btn sys-btn--primary">
            <CalendarX size={18} strokeWidth={1.75} aria-hidden="true" />
            {t.blockButton}
          </button>
        </div>
      </div>
    </form>
  );
}

function Portal({ data }: { data: DemoData }) {
  const lang = useLang();
  const t = useCopy(copy);
  const ids = useId();
  const owner = ownerById[OWNER];
  const month = monthOf(data.today);
  const [openMonth, setOpenMonth] = useState<string | null>(null);

  const homes = useMemo(() => data.units.filter((u) => u.ownerId === owner.id), [data.units, owner.id]);

  // Newest first: this month (still adding up), then last month.
  const statements = useMemo(
    () =>
      [month, addMonths(month, -1)].map((m) => ({
        month: m,
        s: statement(data, owner, m),
        status: (data.payouts.find((p) => p.ownerId === owner.id && p.month === m)?.status ?? 'draft') as Payout['status'],
      })),
    [data, owner, month],
  );
  const thisMonth = statements[0].s;

  const upcoming = useMemo(() => {
    const codes = new Set(homes.map((u) => u.code));
    const stays: Upcoming[] = live(data)
      .filter((r) => codes.has(r.unit) && r.checkOut > data.today)
      .map((r) => ({ id: r.id, unit: r.unit, start: r.checkIn, end: r.checkOut, res: r }));
    const blocks: Upcoming[] = data.blocks
      .filter((b) => codes.has(b.unit) && b.end > data.today)
      .map((b) => ({ id: b.id, unit: b.unit, start: b.start, end: b.end, block: b }));
    return [...stays, ...blocks].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0)).slice(0, 8);
  }, [data, homes]);
  const guests = useMemo(() => new Map(data.guests.map((g) => [g.id, g])), [data.guests]);

  const firstName = owner.name[lang].split(' ')[0];

  return (
    <div className="sys portal">
      <PortalTop />

      <main id="main" className="portal-main">
        <section className="portal-hello">
          {/* One span: .sys-title is a flex row, and the name would otherwise drift off as its own item. */}
          <h1 className="sys-title">
            <span>{t.hello(<bdi>{firstName}</bdi>)}</span>
          </h1>
          <p className="sys-head__sub">{t.sub(monthName(lang, month, false))}</p>
        </section>

        <section className="portal-section" aria-labelledby={`${ids}-month`}>
          <header>
            <h2 id={`${ids}-month`}>{t.thisMonth}</h2>
            <p>{monthName(lang, month)}</p>
          </header>
          <div className="sys-panel">
            <dl className="sys-figures portal-figures">
              <div className="sys-figure">
                <dt>{t.nightsBooked}</dt>
                <dd>{num(lang, thisMonth.nights)}</dd>
              </div>
              <div className="sys-figure">
                <dt>{t.revenue}</dt>
                <dd>{money(lang, thisMonth.gross)}</dd>
              </div>
              <div className="sys-figure">
                <dt>{t.payoutEst}</dt>
                <dd>{money(lang, thisMonth.payout)}</dd>
              </div>
            </dl>
            <p className="portal-panel__note">{t.monthNote(day(lang, monthStart(addMonths(month, 1)), { day: 'numeric', month: 'long' }))}</p>
          </div>
        </section>

        <section className="portal-section" aria-labelledby={`${ids}-homes`}>
          <header>
            <h2 id={`${ids}-homes`}>{t.homes}</h2>
          </header>
          <div className="portal-homes">
            {homes.map((u) => (
              <HomeCard key={u.code} unit={u} data={data} month={month} />
            ))}
          </div>
        </section>

        <section className="portal-section" aria-labelledby={`${ids}-coming`}>
          <header>
            <h2 id={`${ids}-coming`}>{t.comingUp}</h2>
            <p>{t.privacy}</p>
          </header>
          <div className="sys-panel">
            {upcoming.length ? (
              <ul className="sys-list">
                {upcoming.map((item) => {
                  const staying = item.start <= data.today;
                  const guest = item.res?.guestId ? guests.get(item.res.guestId) : undefined;
                  const ownStay = item.block?.reason === 'owner';
                  return (
                    <li key={item.id} className="portal-stay">
                      <div className="portal-stay__main">
                        <b className="num">{stayRange(lang, item.start, item.end)}</b>
                        <span className="sys-muted sys-tiny">
                          {item.res ? (
                            <>
                              {guest ? <bdi>{guest.name.split(/\s+/)[0]}</bdi> : t.guestOf(channelLabel[item.res.channel][lang])}
                              {' · '}
                            </>
                          ) : null}
                          {nightsText(lang, diffDays(item.start, item.end))} · <Code>{item.unit}</Code>
                        </span>
                      </div>
                      <div className="portal-stay__end">
                        {staying ? <Badge tone="info">{t.now}</Badge> : null}
                        {item.res ? (
                          <ChannelChip channel={item.res.channel} />
                        ) : (
                          <Badge plain>{ownStay ? t.yourStay : blockLabel.maintenance[lang]}</Badge>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="sys-panel__body sys-muted">{t.nothingComing}</p>
            )}
          </div>
        </section>

        <section className="portal-section" aria-labelledby={`${ids}-statements`}>
          <header>
            <h2 id={`${ids}-statements`}>{t.statements}</h2>
            <p>{t.terms(packageLabel[owner.package][lang], pct(lang, owner.commission), t.payTo[owner.payout])}</p>
          </header>
          <div className="sys-panel">
            <ul className="sys-list">
              {statements.map(({ month: m, s, status }) => {
                const open = openMonth === m;
                const name = monthName(lang, m);
                const detailId = `${ids}-statement-${m}`;
                return (
                  <li key={m}>
                    <div className="portal-statement">
                      <div className="portal-statement__main">
                        <b>{name}</b>
                        <span className="sys-muted sys-tiny">{status === 'draft' ? t.estimated : t.payout}</span>
                      </div>
                      <b className="portal-statement__amount num">{money(lang, s.payout)}</b>
                      <Badge tone={payoutTone[status]}>{t.status[status]}</Badge>
                      <button
                        type="button"
                        className="sys-btn sys-btn--secondary"
                        aria-expanded={open}
                        aria-controls={open ? detailId : undefined}
                        aria-label={open ? t.hideLabel(name) : t.viewLabel(name)}
                        onClick={() => setOpenMonth(open ? null : m)}
                      >
                        {open ? t.hide : t.view}
                      </button>
                    </div>
                    {open ? <StatementDetail id={detailId} s={s} owner={owner} draft={status === 'draft'} /> : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="portal-section" aria-labelledby={`${ids}-block`}>
          <header>
            <h2 id={`${ids}-block`}>{t.block}</h2>
            <p>{t.blockSub}</p>
          </header>
          <BlockForm data={data} homes={homes} owner={owner} titleId={`${ids}-block`} />
        </section>

        <p className="portal-sample">{t.sample}</p>
      </main>
    </div>
  );
}

/**
 * The owner portal: one owner's homes, month, statements and own-stay dates, calmer and closer to the
 * website than the admin screens. Its own frame, outside the admin shell; the data arrives after mount.
 */
export function PortalScreen() {
  const { data } = useDemo();
  const t = useCopy(copy);
  if (!data) {
    return (
      <div className="sys portal">
        <PortalTop />
        <main id="main" className="portal-main" aria-busy="true">
          <p className="sys-muted">{t.loading}</p>
          <div className="sys-skeleton" style={{ blockSize: '7rem' }} />
          <div className="sys-skeleton" style={{ blockSize: '20rem' }} />
        </main>
      </div>
    );
  }
  return <Portal data={data} />;
}
