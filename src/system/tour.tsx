'use client';

/**
 * The guided demo: one day at Escape Away in ten short steps. Each step can act on the sample (a
 * website booking, an Airbnb clash, the fix, the missing details, a finished clean), so the visitor
 * watches the system work instead of reading about it.
 */
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { unitByCode } from './catalog';
import { useLang } from './copy';
import { addDays, weekday } from './dates';
import { stayRange } from './format';
import { blockAlert, clashAlert, moveTo, twinFor } from './ops';
import { freeFrom } from './select';
import { stayPrice } from './seed';
import { useDemo } from './store';
import type { DemoData, L10n, Reservation } from './types';

type Ctx = ReturnType<typeof useDemo> & { data: DemoData };

type Step = {
  path: string;
  locale?: 'ar';
  title: L10n;
  body: L10n;
  action?: { label: L10n; run: (ctx: Ctx) => void; done: (data: DemoData) => boolean };
  /** A booking the step is about: the calendar brings its nights into view whenever the step opens. */
  focus?: string;
};

const WEB = 'tour-web';
const AB = 'tour-ab';
const CLEAN = 'tour-clean';
const tourUnit = 'NC-MRS-014';

/** The housekeeper whose phone the tour opens: the one with the most cleans today. */
export function busiestHousekeeper(data: DemoData) {
  const counts = new Map<string, number>();
  for (const t of data.tasks) if (t.type === 'turnover' && t.date === data.today) counts.set(t.staffId, (counts.get(t.staffId) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'fatma';
}

function bookOnWebsite({ data, dispatch, toast, setFocus }: Ctx) {
  // The next free Thursday-to-Sunday weekend at least ten days out.
  let from = addDays(data.today, 10);
  while (weekday(from) !== 4) from = addDays(from, 1);
  let checkIn = freeFrom(data, tourUnit, from, 3) ?? from;
  for (let i = 0; i < 6 && weekday(checkIn) !== 4; i += 1) checkIn = freeFrom(data, tourUnit, addDays(checkIn, 1), 3) ?? checkIn;
  const checkOut = addDays(checkIn, 3);
  const total = stayPrice(unitByCode[tourUnit], checkIn, checkOut);
  const reservation: Reservation = {
    id: WEB,
    ref: `EA-${data.today.slice(2, 4)}${data.today.slice(5, 7)}-0191`,
    unit: tourUnit,
    channel: 'direct',
    checkIn,
    checkOut,
    adults: 5,
    guestId: 'g-eg-10',
    total,
    paid: total,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };
  dispatch({ type: 'reservation/add', reservation }, { type: 'alert/add', alert: blockAlert(reservation, 'Mariam Ehab') });
  toast(
    {
      en: `New website booking: Mariam Ehab, ${tourUnit}, ${stayRange('en', checkIn, checkOut)}. Paid with Paymob.`,
      ar: `حجز جديد من الموقع: Mariam Ehab، ${tourUnit}، ${stayRange('ar', checkIn, checkOut)}. اتدفع بـ Paymob.`,
    },
    'success',
  );
  setFocus(WEB);
}

function airbnbArrives({ data, dispatch, toast, setFocus }: Ctx) {
  const web = data.reservations.find((r) => r.id === WEB);
  if (!web) return;
  const now = new Date().toISOString();
  const reservation: Reservation = {
    id: AB,
    ref: 'HMZ8K4TQ2W',
    unit: web.unit,
    channel: 'airbnb',
    checkIn: addDays(web.checkIn, 1),
    checkOut: addDays(web.checkOut, 1),
    adults: 4,
    total: 0,
    paid: 0,
    status: 'confirmed',
    needsDetails: true,
    syncedAt: now,
    createdAt: now,
  };
  dispatch({ type: 'reservation/add', reservation }, { type: 'feeds/sync', at: now }, { type: 'alert/add', alert: clashAlert(reservation, web) });
  toast({ en: `Calendar sync: a new Airbnb booking on ${web.unit} overlaps ${web.ref}.`, ar: `تحديث التقويم: حجز Airbnb جديد على ${web.unit} متداخل مع ${web.ref}.` }, 'error');
  setFocus(AB);
}

function moveWebsiteGuest({ data, dispatch, toast, setFocus }: Ctx) {
  const web = data.reservations.find((r) => r.id === WEB);
  if (!web) return;
  const twin = twinFor(data, web);
  if (!twin) return;
  dispatch(...moveTo(web, twin.code));
  toast({ en: `Mariam moved to ${twin.code}. She gets a WhatsApp message with the new address.`, ar: `مريم اتنقلت لـ ${twin.code}. هيوصلها رسالة واتساب بالعنوان الجديد.` }, 'success');
  setFocus(WEB);
}

function fillDetails({ data, dispatch, toast, setPanel }: Ctx) {
  const ab = data.reservations.find((r) => r.id === AB);
  if (!ab) return;
  const total = stayPrice(unitByCode[ab.unit], ab.checkIn, ab.checkOut);
  dispatch({ type: 'reservation/update', id: AB, patch: { guestId: 'g-gf-4', total, paid: total, needsDetails: false } });
  toast({ en: 'Details saved: Saeed Al Ketbi, his phone, and the price from the Airbnb app.', ar: 'البيانات اتحفظت: Saeed Al Ketbi وتليفونه والسعر من تطبيق Airbnb.' }, 'success');
  setPanel({ kind: 'reservation', id: AB });
}

function finishClean({ data, dispatch, toast }: Ctx) {
  const staffId = busiestHousekeeper(data);
  const task = data.tasks.find((t) => t.staffId === staffId && t.date === data.today && t.type === 'turnover' && t.status !== 'done');
  if (!task) return;
  const text = { en: `${task.unit} is clean and ready for the next guest.`, ar: `${task.unit} نضيفة وجاهزة للضيف الجاي.` };
  // The team hears about it too; the message also marks this step as done.
  dispatch(
    { type: 'task/update', id: task.id, patch: { status: 'done' } },
    { type: 'alert/add', alert: { id: CLEAN, at: new Date().toISOString(), kind: 'task', text } },
  );
  toast(text, 'success');
}

export const steps: Step[] = [
  {
    path: '/admin',
    title: { en: 'One day at Escape Away', ar: 'يوم في Escape Away' },
    body: {
      en: 'Ten short steps, about two minutes. Everything here is sample data: the homes, guests, owners and numbers are made up for the demo.',
      ar: 'عشر خطوات قصيرة، حوالي دقيقتين. كل حاجة هنا بيانات تجريبية: الوحدات والضيوف والملاك والأرقام متألفة للعرض.',
    },
  },
  {
    path: '/admin',
    title: { en: 'Today, in one place', ar: 'النهاردة، في مكان واحد' },
    body: {
      en: 'Arrivals, departures, the day’s cleans and what needs attention, whatever channel the booking came from. One clash is already flagged in Gouna.',
      ar: 'الوصول والمغادرة ونضافة اليوم واللي محتاج اهتمام، أيًا كانت القناة اللي الحجز جه منها. وفيه تعارض متعلّم عليه في الجونة.',
    },
  },
  {
    path: '/admin/calendar',
    title: { en: 'Every home on one timetable', ar: 'كل الوحدات في جدول واحد' },
    body: {
      en: 'Homes are rows, days are columns, each bar is a stay with its channel: AB Airbnb, BK Booking.com, DR website, WA WhatsApp, PH phone. Click any bar to open it.',
      ar: 'الوحدات صفوف والأيام أعمدة، وكل شريط إقامة عليها قناتها: AB ‏Airbnb، ‏BK ‏Booking.com، ‏DR الموقع، WA واتساب، PH تليفون. دوس على أي شريط يفتح.',
    },
  },
  {
    path: '/admin/calendar',
    title: { en: 'A guest books on the website', ar: 'ضيفة بتحجز من الموقع' },
    body: {
      en: 'Mariam books the Marassi chalet and pays with Paymob. It lands here at once, and the team gets a WhatsApp alert to close those nights on Airbnb and Booking.com.',
      ar: 'مريم بتحجز شاليه مراسي وبتدفع بـ Paymob. الحجز بيظهر هنا فورًا، والفريق بيوصله تنبيه واتساب يقفل الليالي دي على Airbnb و Booking.com.',
    },
    action: { label: { en: 'Book it', ar: 'احجز' }, run: bookOnWebsite, done: (d) => d.reservations.some((r) => r.id === WEB) },
    focus: WEB,
  },
  {
    path: '/admin/calendar',
    title: { en: 'Airbnb’s calendar brings a clash', ar: 'تقويم Airbnb بيجيب تعارض' },
    body: {
      en: 'Airbnb reads our calendar only every few hours. Before it did, someone booked the same chalet there. The booking is saved, never dropped, and both bars turn red.',
      ar: 'Airbnb بيقرأ تقويمنا كل كام ساعة بس. قبل ما يقرأه، حد حجز نفس الشاليه هناك. الحجز بيتحفظ ومش بيضيع، والشريطين بيبقوا أحمر.',
    },
    action: { label: { en: 'Run the calendar sync', ar: 'شغّل تحديث التقويم' }, run: airbnbArrives, done: (d) => d.reservations.some((r) => r.id === AB) },
    focus: AB,
  },
  {
    path: '/admin/calendar',
    title: { en: 'Fixed in one click', ar: 'بيتصلّح بضغطة واحدة' },
    body: {
      en: 'The system finds an identical chalet free on those nights. Mariam moves there and gets a WhatsApp message with the new address; the Airbnb guest keeps the original.',
      ar: 'السيستم بيلاقي شاليه زيه فاضي في نفس الليالي. مريم بتتنقل له وبيوصلها رسالة واتساب بالعنوان الجديد، وضيف Airbnb بيفضل في الأصلي.',
    },
    action: {
      label: { en: 'Move Mariam', ar: 'انقل مريم' },
      run: moveWebsiteGuest,
      done: (d) => {
        const web = d.reservations.find((r) => r.id === WEB);
        return !!web && web.unit !== tourUnit;
      },
    },
    focus: WEB,
  },
  {
    path: '/admin/reservations',
    title: { en: 'Dates arrive, details follow', ar: 'التواريخ بتوصل، والبيانات بعدها' },
    body: {
      en: 'Calendar links carry nights only. The Airbnb booking waits under Needs details until someone copies the guest’s name, phone and price from the Airbnb app.',
      ar: 'روابط التقويم بتجيب الليالي بس. حجز Airbnb بيستنى في "ناقص البيانات" لحد ما حد ينقل اسم الضيف وتليفونه والسعر من تطبيق Airbnb.',
    },
    action: {
      label: { en: 'Fill in the details', ar: 'كمّل البيانات' },
      run: fillDetails,
      done: (d) => d.reservations.some((r) => r.id === AB && !r.needsDetails),
    },
  },
  {
    path: '/staff',
    locale: 'ar',
    title: { en: 'A checkout becomes a clean', ar: 'المغادرة بتبقى مهمة نضافة' },
    body: {
      en: 'When a guest leaves, the turnover lands on the housekeeper’s phone, in Arabic, with the time the next guest arrives.',
      ar: 'لما الضيف يمشي، مهمة النضافة بتوصل على موبايل المسؤولة، بالعربي، ومعاها ميعاد وصول الضيف اللي بعده.',
    },
    action: {
      label: { en: 'Finish a clean', ar: 'خلّص نضافة' },
      run: finishClean,
      done: (d) => d.alerts.some((a) => a.id === CLEAN),
    },
  },
  {
    path: '/portal',
    title: { en: 'Owners see their month', ar: 'الملاك بيشوفوا شهرهم' },
    body: {
      en: 'Nadia lives in Dubai and owns two homes. She sees every stay, her statement and her payout, and blocks dates for her own visits.',
      ar: 'نادية عايشة في دبي وعندها وحدتين. بتشوف كل الإقامات وكشف حسابها والمبلغ اللي هيتحوّل لها، وبتقفل تواريخ لزياراتها.',
    },
  },
  {
    path: '/admin',
    title: { en: 'That’s the system', ar: 'ده السيستم' },
    body: {
      en: 'One database for the website and the team, in Arabic and English. Click around: every booking, unit and button works on this sample.',
      ar: 'قاعدة بيانات واحدة للموقع والفريق، بالعربي والإنجليزي. اتفرّج براحتك: كل حجز ووحدة وزرار شغال على العينة دي.',
    },
  },
];

const ui = {
  en: { of: (a: number, b: number) => `Step ${a} of ${b}`, next: 'Next', back: 'Back', start: 'Start', finish: 'Finish', close: 'Close the demo' },
  ar: { of: (a: number, b: number) => `خطوة ${a} من ${b}`, next: 'التالي', back: 'رجوع', start: 'ابدأ', finish: 'خلصنا', close: 'اقفل الجولة' },
};

export function Tour() {
  const lang = useLang();
  const t = ui[lang];
  const demo = useDemo();
  const { data, tour, setTour } = demo;
  const router = useRouter();
  const pathname = usePathname().replace(/\/+$/, '') || '/';
  // The opening card stays on whatever page it opens over; later steps take the visitor where they happen.
  const navigated = useRef(tour.step === 0 ? 0 : -1);
  const step = steps[Math.min(tour.step, steps.length - 1)];

  useEffect(() => {
    if (navigated.current === tour.step) return;
    navigated.current = tour.step;
    const wanted = step.locale ?? tour.lang ?? lang;
    if (pathname !== step.path || wanted !== lang) router.push(step.path, { locale: wanted });
    // Opening (or reopening) a calendar step points at its booking, so its bars are in view.
    if (step.focus && demo.data?.reservations.some((r) => r.id === step.focus)) demo.setFocus(step.focus);
  }, [tour.step, tour.lang, step, pathname, lang, router, demo]);

  if (!data) return null;
  const ctx = { ...demo, data } as Ctx;
  const last = tour.step === steps.length - 1;
  const actionDone = step.action ? step.action.done(data) : true;
  const solo = !pathname.startsWith('/admin');

  // Starting the tour remembers its language; every later move keeps it.
  const goTo = (n: number) => setTour({ open: true, step: n, lang: tour.step === 0 ? lang : (tour.lang ?? lang) });

  return (
    <section className={`sys-tour${solo ? ' is-solo' : ''}`} aria-label={step.title[lang]} aria-live="polite">
      <button type="button" className="sys-btn sys-btn--quiet sys-btn--icon sys-btn--small sys-tour__close" aria-label={t.close} onClick={() => setTour({ ...tour, open: false })}>
        <X size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <span className="sys-tour__step">{t.of(tour.step + 1, steps.length)}</span>
      <h2>{step.title[lang]}</h2>
      <p>{step.body[lang]}</p>
      <div className="sys-tour__actions">
        {step.action && !actionDone ? (
          <button type="button" className="sys-btn sys-btn--primary" onClick={() => step.action!.run(ctx)}>
            {step.action.label[lang]}
          </button>
        ) : (
          <button
            type="button"
            className="sys-btn sys-btn--primary"
            onClick={() => (last ? setTour({ open: false, step: 0 }) : goTo(tour.step + 1))}
          >
            {tour.step === 0 ? t.start : last ? t.finish : t.next}
            {!last ? <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" className="flip-rtl" /> : null}
          </button>
        )}
        {tour.step > 0 ? (
          <button type="button" className="sys-btn sys-btn--quiet" onClick={() => goTo(tour.step - 1)}>
            <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" className="flip-rtl" />
            {t.back}
          </button>
        ) : null}
        <span className="sys-tour__dots" aria-hidden="true">
          {steps.map((_, i) => (
            <i key={i} className={i === tour.step ? 'is-on' : undefined} />
          ))}
        </span>
      </div>
    </section>
  );
}
