'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import { formatNumber } from '@/lib/format';
import { MinusIcon, PlusIcon } from '../explorer/icons';

export type Guests = { adults: number; children: number; infants: number };

const MAX_GUESTS = 16;
const MAX_INFANTS = 6;

/** Adults, children and infants, each with a stepper. Children or infants bring at least one adult. */
export function GuestsPanel({
  locale,
  guests,
  onChange,
  onDone,
}: {
  locale: Locale;
  guests: Guests;
  /** Takes an updater, so quick repeated taps each count. */
  onChange: (update: (previous: Guests) => Guests) => void;
  /** In a popover: a Done button that closes it, like the calendar's. */
  onDone?: () => void;
}) {
  const t = useTranslations('search');
  const id = useId();
  const { adults, children, infants } = guests;

  const rows = [
    { key: 'adults' as const, label: t('adults'), hint: t('adultsHint'), min: children || infants ? 1 : 0, max: MAX_GUESTS - children },
    { key: 'children' as const, label: t('children'), hint: t('childrenHint'), min: 0, max: MAX_GUESTS - adults },
    { key: 'infants' as const, label: t('infants'), hint: t('infantsHint'), min: 0, max: MAX_INFANTS },
  ];

  const step = (key: keyof Guests, delta: number) =>
    onChange((prev) => {
      const limits = {
        adults: [prev.children || prev.infants ? 1 : 0, MAX_GUESTS - prev.children],
        children: [0, MAX_GUESTS - prev.adults],
        infants: [0, MAX_INFANTS],
      }[key];
      const next = { ...prev, [key]: Math.min(limits[1], Math.max(limits[0], prev[key] + delta)) };
      if ((next.children || next.infants) && !next.adults) next.adults = 1;
      return next;
    });

  return (
    <div className="guests">
      {rows.map((row) => {
        const value = guests[row.key];
        return (
          <div key={row.key} className="stepper">
            <div className="stepper__label">
              <span id={`${id}-${row.key}`}>{row.label}</span>
              <span className="t-small text-fg-muted">{row.hint}</span>
            </div>
            <div className="stepper__ctrl">
              <button
                type="button"
                className="round pressable"
                onClick={() => step(row.key, -1)}
                disabled={value <= row.min}
                aria-label={t('less', { what: row.label })}
              >
                <MinusIcon />
              </button>
              <output className="stepper__value tabular" aria-labelledby={`${id}-${row.key}`} aria-live="polite">
                {formatNumber(locale, value)}
              </output>
              <button
                type="button"
                className="round pressable"
                onClick={() => step(row.key, 1)}
                disabled={value >= row.max}
                aria-label={t('more', { what: row.label })}
              >
                <PlusIcon />
              </button>
            </div>
          </div>
        );
      })}
      {onDone ? (
        <div className="guests__foot">
          <button type="button" className="btn btn--primary btn--small" onClick={onDone}>
            {t('done')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
