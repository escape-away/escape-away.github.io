'use client';

import '@/styles/system-apps.css';
import {
  ArrowLeft,
  Check,
  ClipboardCheck,
  Clock,
  MapPin,
  Play,
  RotateCcw,
  Send,
  SprayCan,
  TriangleAlert,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { EaMark } from '@/components/ea-mark';
import { LanguageSwitch } from '@/components/language-switch';
import { Link } from '@/i18n/navigation';
import { areaById, compoundByCode, fixerFor, unitByCode } from '../catalog';
import { common, taskLabel, taskStatus, useCopy, useLang } from '../copy';
import { addDays } from '../dates';
import { count, day, guestsCount, longDay, num } from '../format';
import { newId } from '../ops';
import { live } from '../select';
import { useDemo } from '../store';
import { busiestHousekeeper } from '../tour';
import type { DemoData, Lang, Reservation, Task, TaskType } from '../types';
import { Badge, Code, Empty, type Tone } from '../ui/bits';

/** The plural forms format.ts's count() takes; '#' becomes the number. */
type Forms = { one: string; other: string; two?: string; few?: string; many?: string };
type View = 'today' | 'tomorrow' | 'done';
type Kind = 'ac' | 'plumbing' | 'electricity' | 'other';

/** The house times every turnover works around: guests leave by noon, the next ones arrive at three. */
const CHECK_OUT = '12:00';
const CHECK_IN = '15:00';

/*
  The housekeeping team reads this in Arabic, so its Arabic is the team's own: warm Egyptian Arabic in
  short lines, never a translation of the English.
*/
const copy = {
  en: {
    title: 'Housekeeping',
    who: 'Whose tasks?',
    roles: { housekeeping: 'Housekeeping', maintenance: 'Maintenance' },
    hello: (name: ReactNode) => <>Hi {name}.</>,
    left: { one: 'One task left for today.', other: '# tasks left for today.' } as Forms,
    allDone: 'Everything for today is done. Thank you!',
    nothing: 'Nothing on your list today.',
    views: 'Tasks to show',
    tabs: { today: 'Today', tomorrow: 'Tomorrow', done: 'Done' } satisfies Record<View, string>,
    guestsLeft: (guests: string, _one: boolean) => `${guests} checked out`,
    guestsLeave: (guests: string, one: boolean, when: string) => `${guests} ${one ? 'checks' : 'check'} out ${when}`,
    at: (time: string) => `at ${time}`,
    tomorrowAt: (time: string) => `tomorrow at ${time}`,
    onDayAt: (date: string, time: string) => `on ${date} at ${time}`,
    nextGuest: (time: string) => `Next guest arrives at ${time}`,
    reported: (name: string) => `Sent to ${name}`,
    checklist: 'Checklist',
    progress: (a: string, b: string) => `${a} of ${b}`,
    items: [
      'Linen and towels changed',
      'Bathrooms cleaned',
      'Kitchen cleaned',
      'Basics restocked: water, coffee, soap',
      'Photos sent to the office',
    ],
    start: 'Start',
    done: 'Done',
    undo: 'Not done yet',
    report: 'Report a problem',
    reportTitle: 'Report a problem',
    whatsWrong: 'What’s wrong?',
    kinds: { ac: 'AC', plumbing: 'Plumbing', electricity: 'Electricity', other: 'Other' } satisfies Record<Kind, string>,
    pickKind: 'Pick what’s wrong first.',
    note: 'Note (optional)',
    notePlaceholder: 'For example: the bedroom AC is dripping',
    send: 'Send to maintenance',
    cancel: 'Cancel',
    issueDefault: {
      ac: 'The AC needs a look.',
      plumbing: 'The plumbing needs a look.',
      electricity: 'Something electrical needs a look.',
      other: 'Something needs fixing.',
    } satisfies Record<Kind, string>,
    sent: (name: string, unit: string) => `Sent to ${name} in maintenance. ${unit} is on today’s list.`,
    cleanDone: (unit: string) => `${unit} is clean and ready for the next guest.`,
    fixDone: (unit: string) => `${unit}: repair done. The office can see it.`,
    checkDone: (unit: string) => `${unit}: inspection done.`,
    empty: {
      today: { title: 'Nothing on your list today.', hint: 'New cleans show up here as guests check out.' },
      tomorrow: { title: 'Nothing for tomorrow yet.', hint: 'Tomorrow’s check-outs land here.' },
      done: { title: 'Nothing finished yet.', hint: 'Tap Done on a task and it moves here.' },
    } satisfies Record<View, { title: string; hint: string }>,
    back: 'Back to the system',
    loading: 'Getting your list ready…',
  },
  ar: {
    title: 'النضافة',
    who: 'مهام مين؟',
    roles: { housekeeping: 'النضافة', maintenance: 'الصيانة' },
    hello: (name: ReactNode) => <>أهلًا يا {name}.</>,
    left: {
      one: 'فاضل مهمة واحدة النهاردة.',
      two: 'فاضل مهمتين النهاردة.',
      few: 'فاضل # مهام النهاردة.',
      many: 'فاضل # مهمة النهاردة.',
      other: 'فاضل # مهمة النهاردة.',
    } as Forms,
    allDone: 'كل مهام النهاردة خلصت. تسلم إيدك!',
    nothing: 'مفيش مهام عليك النهاردة.',
    views: 'المهام',
    tabs: { today: 'النهاردة', tomorrow: 'بكرة', done: 'خلصت' } satisfies Record<View, string>,
    guestsLeft: (guests: string, one: boolean) => `${guests} ${one ? 'مشي' : 'مشيوا'} خلاص`,
    guestsLeave: (guests: string, one: boolean, when: string) => `${guests} ${one ? 'هيمشي' : 'هيمشوا'} ${when}`,
    at: (time: string) => `الساعة ${time}`,
    tomorrowAt: (time: string) => `بكرة الساعة ${time}`,
    onDayAt: (date: string, time: string) => `يوم ${date} الساعة ${time}`,
    nextGuest: (time: string) => `الضيف الجاي هيوصل الساعة ${time}`,
    reported: (name: string) => `اتبلّغ ${name}`,
    checklist: 'المطلوب',
    progress: (a: string, b: string) => `${a} من ${b}`,
    items: [
      'الملايات والفوط اتغيّرت',
      'الحمامات اتنضّفت',
      'المطبخ اتنضّف',
      'الأساسيات اتكمّلت: مية وقهوة وصابون',
      'الصور اتبعتت للمكتب',
    ],
    start: 'ابدأ',
    done: 'خلصت',
    undo: 'لسه مخلصتش',
    report: 'فيه مشكلة',
    reportTitle: 'بلاغ عن مشكلة',
    whatsWrong: 'إيه المشكلة؟',
    kinds: { ac: 'التكييف', plumbing: 'السباكة', electricity: 'الكهربا', other: 'حاجة تانية' } satisfies Record<Kind, string>,
    pickKind: 'نوع المشكلة لازم يتحدد الأول.',
    note: 'ملاحظة (اختياري)',
    notePlaceholder: 'مثلًا: تكييف أوضة النوم بينقّط',
    send: 'ابعت للصيانة',
    cancel: 'إلغاء',
    issueDefault: {
      ac: 'التكييف محتاج حد يبص عليه.',
      plumbing: 'السباكة محتاجة حد يبص عليها.',
      electricity: 'فيه مشكلة في الكهربا.',
      other: 'فيه حاجة محتاجة تتصلّح.',
    } satisfies Record<Kind, string>,
    sent: (name: string, unit: string) => `اتبعتت ل${name} في الصيانة. ${unit} على جدول النهاردة.`,
    cleanDone: (unit: string) => `${unit} نضيفة وجاهزة للضيف الجاي.`,
    fixDone: (unit: string) => `${unit}: التصليح خلص، والمكتب شايفه.`,
    checkDone: (unit: string) => `${unit}: المعاينة خلصت.`,
    empty: {
      today: { title: 'مفيش مهام عليك النهاردة.', hint: 'أول ما ضيف يمشي، النضافة بتاعته هتظهر هنا.' },
      tomorrow: { title: 'لسه مفيش حاجة لبكرة.', hint: 'مغادرات بكرة هتظهر هنا.' },
      done: { title: 'لسه مفيش حاجة خلصت.', hint: 'أي مهمة تخلص هتنزل هنا.' },
    } satisfies Record<View, { title: string; hint: string }>,
    back: 'ارجع للسيستم',
    loading: 'بنجهّز مهامك…',
  },
};

const views: View[] = ['today', 'tomorrow', 'done'];
const kinds: Kind[] = ['ac', 'plumbing', 'electricity', 'other'];
const taskIcon: Record<TaskType, LucideIcon> = { turnover: SprayCan, inspection: ClipboardCheck, maintenance: Wrench };
const statusTone: Record<Task['status'], Tone> = { todo: 'warn', doing: 'info', done: 'ok' };

const byTime = (a: Task, b: Task) =>
  a.date.localeCompare(b.date) || a.window[0].localeCompare(b.window[0]) || a.window[1].localeCompare(b.window[1]) || a.unit.localeCompare(b.unit);

type Copy = (typeof copy)['en'];

/** The leaving guests, as the housekeeper needs it: how many, and whether they are already out. */
function leavingLine(lang: Lang, t: Copy, res: Reservation, today: string) {
  const guests = guestsCount(lang, res.adults);
  const one = res.adults === 1;
  if (res.status === 'checked-out') return t.guestsLeft(guests, one);
  const when =
    res.checkOut === today ? t.at(CHECK_OUT) : res.checkOut === addDays(today, 1) ? t.tomorrowAt(CHECK_OUT) : t.onDayAt(day(lang, res.checkOut), CHECK_OUT);
  return t.guestsLeave(guests, one, when);
}

function doneToast(task: Task) {
  if (task.type === 'turnover') return { en: copy.en.cleanDone(task.unit), ar: copy.ar.cleanDone(task.unit) };
  if (task.type === 'maintenance') return { en: copy.en.fixDone(task.unit), ar: copy.ar.fixDone(task.unit) };
  return { en: copy.en.checkDone(task.unit), ar: copy.ar.checkDone(task.unit) };
}

function ReportForm({ task, today, onClose }: { task: Task; today: string; onClose: (fixerId?: string) => void }) {
  const t = useCopy(copy);
  const { dispatch, toast } = useDemo();
  const [kind, setKind] = useState<Kind | null>(null);
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const ids = useId();

  useEffect(() => {
    heading.current?.focus();
  }, []);

  const send = () => {
    setTried(true);
    if (!kind) return;
    const unit = unitByCode[task.unit];
    const fixer = fixerFor(unit.area);
    const text = note.trim();
    const issue = text
      ? { en: kind === 'other' ? text : `${copy.en.kinds[kind]}: ${text}`, ar: kind === 'other' ? text : `${copy.ar.kinds[kind]}: ${text}` }
      : { en: copy.en.issueDefault[kind], ar: copy.ar.issueDefault[kind] };
    dispatch({
      type: 'task/add',
      task: { id: newId('m'), unit: unit.code, type: 'maintenance', date: today, window: ['10:00', '13:00'], staffId: fixer.id, status: 'todo', issue },
    });
    toast({ en: copy.en.sent(fixer.name.en, unit.code), ar: copy.ar.sent(fixer.name.ar, unit.code) }, 'success');
    onClose(fixer.id);
  };

  return (
    <form
      className="staff-report"
      aria-labelledby={`${ids}-title`}
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <h3 id={`${ids}-title`} ref={heading} tabIndex={-1}>
        {t.reportTitle}
      </h3>
      <div className="sys-field" role="group" aria-labelledby={`${ids}-kind`}>
        <span id={`${ids}-kind`}>{t.whatsWrong}</span>
        <div className="sys-segment staff-kinds">
          {kinds.map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {t.kinds[k]}
            </button>
          ))}
        </div>
        {tried && !kind ? (
          <span className="sys-error" role="alert">
            {t.pickKind}
          </span>
        ) : null}
      </div>
      <label className="sys-field">
        <span>{t.note}</span>
        <textarea className="sys-input" dir="auto" rows={3} value={note} placeholder={t.notePlaceholder} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="staff-task__actions">
        <button type="submit" className="sys-btn sys-btn--primary sys-btn--block">
          <Send size={18} strokeWidth={1.75} aria-hidden="true" className="flip-rtl" />
          {t.send}
        </button>
        <button type="button" className="sys-btn sys-btn--quiet sys-btn--block" onClick={() => onClose()}>
          {t.cancel}
        </button>
      </div>
    </form>
  );
}

type CardProps = {
  task: Task;
  data: DemoData;
  view: View;
  /** The one task the screen points at: its main button is the filled one. */
  lead: boolean;
  ticked: number[];
  onTick: (item: number) => void;
  reporting: boolean;
  onReport: () => void;
  onReportClose: (fixerId?: string) => void;
  reportedTo?: string;
};

function TaskCard({ task, data, view, lead, ticked, onTick, reporting, onReport, onReportClose, reportedTo }: CardProps) {
  const lang = useLang();
  const t = useCopy(copy);
  const { dispatch, toast } = useDemo();
  const ids = useId();
  const unit = unitByCode[task.unit];
  const res = task.reservationId ? data.reservations.find((r) => r.id === task.reservationId) : undefined;
  // A guest checking in the day of the clean sets the deadline.
  const nextArrives =
    task.type === 'turnover' && live(data).some((r) => r.unit === task.unit && r.checkIn === task.date && r.id !== task.reservationId);
  const reportedName = reportedTo ? data.staff.find((s) => s.id === reportedTo)?.name[lang] : undefined;
  const Icon = taskIcon[task.type];
  const main = lead && !reporting ? 'sys-btn--primary' : 'sys-btn--secondary';
  const showChecklist = view === 'today' && task.type === 'turnover' && task.status === 'doing';

  const finish = () => {
    dispatch({ type: 'task/update', id: task.id, patch: { status: 'done' } });
    toast(doneToast(task), 'success');
  };

  return (
    <article className="staff-task" aria-labelledby={`${ids}-title`}>
      <header className="staff-task__head">
        <h2 id={`${ids}-title`}>
          <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
          {taskLabel[task.type][lang]}
        </h2>
        <Badge tone={statusTone[task.status]}>{taskStatus[task.status][lang]}</Badge>
      </header>

      <ul className="staff-task__facts">
        <li>
          <MapPin size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>
            <Code>{unit.code}</Code> · {compoundByCode[unit.compound].name[lang]} · {areaById[unit.area].name[lang]}
          </span>
        </li>
        <li>
          <Clock size={16} strokeWidth={1.75} aria-hidden="true" />
          <span className="num ltr" dir="ltr">
            {task.window[0]}–{task.window[1]}
          </span>
        </li>
        {res ? (
          <li>
            <Users size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>{leavingLine(lang, t, res, data.today)}</span>
          </li>
        ) : null}
        {task.issue ? (
          <li>
            <Wrench size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>{task.issue[lang]}</span>
          </li>
        ) : null}
      </ul>

      {nextArrives || reportedName ? (
        <div className="staff-task__flags">
          {nextArrives ? <Badge tone="warn">{t.nextGuest(CHECK_IN)}</Badge> : null}
          {reportedName ? <Badge tone="info">{t.reported(reportedName)}</Badge> : null}
        </div>
      ) : null}

      {showChecklist ? (
        <div className="staff-check" role="group" aria-labelledby={`${ids}-check`}>
          <div className="staff-check__head">
            <h3 id={`${ids}-check`}>{t.checklist}</h3>
            <span className="sys-muted sys-tiny">{t.progress(num(lang, ticked.length), num(lang, t.items.length))}</span>
          </div>
          {t.items.map((item, i) => (
            <label key={item} className="staff-check__item">
              <input type="checkbox" checked={ticked.includes(i)} onChange={() => onTick(i)} />
              <span>{item}</span>
            </label>
          ))}
        </div>
      ) : null}

      {view === 'today' ? (
        <div className="staff-task__actions">
          {task.status === 'todo' ? (
            <button
              type="button"
              className={`sys-btn sys-btn--block ${main}`}
              onClick={() => dispatch({ type: 'task/update', id: task.id, patch: { status: 'doing' } })}
            >
              <Play size={18} strokeWidth={1.75} aria-hidden="true" />
              {t.start}
            </button>
          ) : (
            <button type="button" className={`sys-btn sys-btn--block ${main}`} onClick={finish}>
              <Check size={18} strokeWidth={1.75} aria-hidden="true" />
              {t.done}
            </button>
          )}
          {!reporting ? (
            <button type="button" id={`report-${task.id}`} className="sys-btn sys-btn--quiet sys-btn--block" onClick={onReport}>
              <TriangleAlert size={18} strokeWidth={1.75} aria-hidden="true" />
              {t.report}
            </button>
          ) : null}
        </div>
      ) : null}

      {view === 'done' ? (
        <div className="staff-task__actions">
          <button
            type="button"
            className="sys-btn sys-btn--quiet sys-btn--block"
            onClick={() => dispatch({ type: 'task/update', id: task.id, patch: { status: 'doing' } })}
          >
            <RotateCcw size={18} strokeWidth={1.75} aria-hidden="true" />
            {t.undo}
          </button>
        </div>
      ) : null}

      {reporting ? <ReportForm task={task} today={data.today} onClose={onReportClose} /> : null}
    </article>
  );
}

function StaffApp({ data }: { data: DemoData }) {
  const lang = useLang();
  const t = useCopy(copy);
  const c = useCopy(common);
  const [picked, setPicked] = useState<string | null>(null);
  const [view, setView] = useState<View>('today');
  const [ticks, setTicks] = useState<Record<string, number[]>>({});
  const [reporting, setReporting] = useState<string | null>(null);
  const [reported, setReported] = useState<Record<string, string>>({});
  const refocus = useRef<string | null>(null);

  // Once a report form closes, focus goes back to its task's "Report a problem" button.
  useEffect(() => {
    if (reporting || !refocus.current) return;
    document.getElementById(`report-${refocus.current}`)?.focus();
    refocus.current = null;
  }, [reporting]);

  const today = data.today;
  const tomorrow = addDays(today, 1);
  // The tour opens this phone on the housekeeper with the most cleans today.
  const person = data.staff.find((s) => s.id === (picked ?? busiestHousekeeper(data))) ?? data.staff[0];

  const lists = useMemo(() => {
    const mine = data.tasks.filter((x) => x.staffId === person.id).sort(byTime);
    return {
      today: mine.filter((x) => x.date === today && x.status !== 'done'),
      tomorrow: mine.filter((x) => x.date === tomorrow && x.status !== 'done'),
      done: mine.filter((x) => x.status === 'done' && x.date <= tomorrow),
    } satisfies Record<View, Task[]>;
  }, [data.tasks, person.id, today, tomorrow]);

  const list = lists[view];
  const leadId = view === 'today' ? (list.find((x) => x.status === 'doing') ?? list[0])?.id : undefined;
  const doneToday = lists.done.filter((x) => x.date === today).length;
  const summary = lists.today.length ? count(lang, lists.today.length, copy.en.left, copy.ar.left) : doneToday ? t.allDone : t.nothing;

  const tick = (taskId: string, item: number) =>
    setTicks((all) => {
      const now = all[taskId] ?? [];
      return { ...all, [taskId]: now.includes(item) ? now.filter((i) => i !== item) : [...now, item] };
    });

  const closeReport = (taskId: string, fixerId?: string) => {
    refocus.current = taskId;
    setReporting(null);
    if (fixerId) setReported((all) => ({ ...all, [taskId]: fixerId }));
  };

  return (
    <div className="sys staff">
      <div className="staff-app">
        <header className="staff-app__head">
          <div className="staff-app__brand">
            <EaMark />
            <div className="staff-app__titles">
              <h1 className="staff-app__title">{t.title}</h1>
              <p className="staff-app__date">{longDay(lang, today)}</p>
            </div>
          </div>

          <label className="sys-field">
            <span>{t.who}</span>
            <select
              className="sys-select"
              value={person.id}
              onChange={(e) => {
                setPicked(e.target.value);
                setReporting(null);
              }}
            >
              {(['housekeeping', 'maintenance'] as const).map((role) => (
                <optgroup key={role} label={t.roles[role]}>
                  {data.staff
                    .filter((s) => s.role === role)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name[lang]} · {areaById[s.area].name[lang]}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>

          <p className="staff-app__hello">
            {t.hello(<bdi>{person.name[lang]}</bdi>)} {summary}
          </p>

          <div className="sys-segment staff-tabs" role="group" aria-label={t.views}>
            {views.map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
                {t.tabs[v]}
                <span className="n">{num(lang, lists[v].length)}</span>
              </button>
            ))}
          </div>
        </header>

        <main id="main" className="staff-list">
          {list.length ? (
            list.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                data={data}
                view={view}
                lead={task.id === leadId}
                ticked={ticks[task.id] ?? []}
                onTick={(item) => tick(task.id, item)}
                reporting={reporting === task.id}
                onReport={() => setReporting(task.id)}
                onReportClose={(fixerId) => closeReport(task.id, fixerId)}
                reportedTo={reported[task.id]}
              />
            ))
          ) : (
            <div className="staff-task">
              <Empty title={t.empty[view].title}>{t.empty[view].hint}</Empty>
            </div>
          )}
        </main>

        <footer className="staff-app__foot">
          <Link href="/admin" className="sys-btn sys-btn--quiet">
            <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" className="flip-rtl" />
            {t.back}
          </Link>
          <span className="staff-app__sample">{c.sample}</span>
          <LanguageSwitch text={lang === 'en' ? 'العربية' : 'English'} className="sys-btn sys-btn--quiet" />
        </footer>
      </div>
    </div>
  );
}

/**
 * The housekeeping app: what a housekeeper or a technician sees on their phone, in Arabic first. Its
 * own frame, outside the admin shell; the demo data arrives after the first paint.
 */
export function StaffScreen() {
  const { data } = useDemo();
  const t = useCopy(copy);
  if (!data) {
    return (
      <div className="sys staff">
        <div className="staff-app" aria-busy="true">
          <div className="staff-app__head">
            <div className="staff-app__brand">
              <EaMark />
              <p className="staff-app__date">{t.loading}</p>
            </div>
            <div className="sys-skeleton" style={{ blockSize: '3rem' }} />
            <div className="sys-skeleton" style={{ blockSize: '2.75rem' }} />
          </div>
          <div className="staff-list">
            <div className="sys-skeleton" style={{ blockSize: '13rem' }} />
            <div className="sys-skeleton" style={{ blockSize: '13rem' }} />
          </div>
        </div>
      </div>
    );
  }
  return <StaffApp data={data} />;
}
