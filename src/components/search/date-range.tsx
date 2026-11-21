'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import { formatNumber } from '@/lib/format';
import {
  addDays,
  addMonths,
  calendarFormat,
  fromISO,
  monthGrid,
  monthOf,
  nightsBetween,
  shiftMonth,
  shortDate,
  todayISO,
} from '@/lib/dates';

type Props = {
  locale: Locale;
  open: boolean;
  checkin: string;
  checkout: string;
  onChange: (checkin: string, checkout: string) => void;
  onDone: () => void;
};

/**
 * A range calendar: two months on wider screens, one on phones. Arrow keys move by day and week
 * (mirrored in Arabic), Page Up and Page Down by month, Home and End to the week's edges.
 */
export function DateRange({ locale, open, checkin, checkout, onChange, onDone }: Props) {
  const t = useTranslations('search');
  const today = useMemo(todayISO, []);
  const [month, setMonth] = useState(() => monthOf(checkin || today));
  const [focus, setFocus] = useState(checkin || today);
  const [wide, setWide] = useState(false);
  const grid = useRef<HTMLDivElement>(null);
  const keyboardMove = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 48rem)');
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const start = checkin || today;
    setFocus(start);
    setMonth(monthOf(start));
    keyboardMove.current = true;
    // Opening moves focus into the calendar so the arrow keys work straight away.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const months = wide ? [month, addMonths(month, 1)] : [month];

  useEffect(() => {
    if (!open || !keyboardMove.current) return;
    keyboardMove.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focus}"]`)?.focus({ preventScroll: true });
  }, [focus, month, open]);

  const titles = calendarFormat(locale, { month: 'long', year: 'numeric' });
  const dayLabel = calendarFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const dayNumber = calendarFormat(locale, { day: 'numeric' });
  const weekday = calendarFormat(locale, { weekday: locale === 'ar' ? 'narrow' : 'short' });
  // 6 January 2024 was a Saturday, the first day of the week here.
  const weekdays = Array.from({ length: 7 }, (_, i) => weekday.format(fromISO(addDays('2024-01-06', i))));

  const goTo = (iso: string) => {
    const target = iso < today ? today : iso;
    keyboardMove.current = true;
    setFocus(target);
    const m = monthOf(target);
    const last = months.at(-1)!;
    if (m < month) setMonth(m);
    else if (m > last) setMonth(wide ? addMonths(m, -1) : m);
  };

  const pick = (iso: string) => {
    if (!checkin || checkout || iso <= checkin) onChange(iso, '');
    else onChange(checkin, iso);
    setFocus(iso);
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, iso: string) => {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const day = fromISO(iso).getUTCDay();
    const intoWeek = (day - 6 + 7) % 7;
    const moves: Record<string, () => string> = {
      [rtl ? 'ArrowLeft' : 'ArrowRight']: () => addDays(iso, 1),
      [rtl ? 'ArrowRight' : 'ArrowLeft']: () => addDays(iso, -1),
      ArrowDown: () => addDays(iso, 7),
      ArrowUp: () => addDays(iso, -7),
      PageDown: () => shiftMonth(iso, 1),
      PageUp: () => shiftMonth(iso, -1),
      Home: () => addDays(iso, -intoWeek),
      End: () => addDays(iso, 6 - intoWeek),
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    goTo(move());
  };

  const nights = checkin && checkout ? nightsBetween(checkin, checkout) : 0;
  const status = !checkin
    ? t('pickCheckIn')
    : !checkout
      ? t('pickCheckOut')
      : `${shortDate(locale, checkin)} – ${shortDate(locale, checkout)} · ${t('nights', { count: nights, countText: formatNumber(locale, nights) })}`;

  return (
    <div className="cal" ref={grid}>
      <div className="cal__nav">
        <button
          type="button"
          className="cal__arrow pressable"
          onClick={() => setMonth(addMonths(month, -1))}
          disabled={month <= monthOf(today)}
          aria-label={t('prevMonth')}
        >
          <svg className="cal__icon cal__icon--back" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" className="cal__arrow pressable" onClick={() => setMonth(addMonths(month, 1))} aria-label={t('nextMonth')}>
          <svg className="cal__icon" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="cal__months">
        {months.map((m) => (
          <div key={m} className="cal__month" role="group" aria-label={titles.format(fromISO(m))}>
            <p className="cal__title" aria-hidden="true">
              {titles.format(fromISO(m))}
            </p>
            <div className="cal__grid" aria-hidden="true">
              {weekdays.map((w, i) => (
                <span key={i} className="cal__weekday">
                  {w}
                </span>
              ))}
            </div>
            <div className="cal__grid">
              {monthGrid(m).map((iso, i) => {
                if (!iso) return <span key={`pad-${i}`} />;
                const past = iso < today;
                const start = iso === checkin;
                const end = iso === checkout;
                const between = !!checkin && !!checkout && iso > checkin && iso < checkout;
                return (
                  <button
                    key={iso}
                    type="button"
                    data-date={iso}
                    className="cal__day tabular"
                    data-state={start ? 'start' : end ? 'end' : between ? 'between' : undefined}
                    data-today={iso === today || undefined}
                    disabled={past}
                    tabIndex={iso === focus ? 0 : -1}
                    aria-pressed={start || end}
                    aria-label={dayLabel.format(fromISO(iso))}
                    onClick={() => pick(iso)}
                    onKeyDown={(e) => onKey(e, iso)}
                  >
                    {dayNumber.format(fromISO(iso))}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="cal__foot">
        <p className="cal__status tabular" aria-live="polite">
          {status}
        </p>
        <div className="cal__actions">
          {checkin ? (
            <button type="button" className="link-btn" onClick={() => onChange('', '')}>
              {t('clearDates')}
            </button>
          ) : null}
          <button type="button" className="btn btn--primary btn--small" onClick={onDone}>
            {t('done')}
          </button>
        </div>
      </div>
    </div>
  );
}
