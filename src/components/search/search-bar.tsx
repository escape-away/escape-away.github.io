'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import { shortDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { matchesAll, normalize } from '@/lib/normalize';
import { requestMapView } from '@/lib/explorer-view';
import type { WhereOption } from '@/lib/search-options';
import { lenis, scrollToSection, setSearch, useSearch } from '@/lib/search-state';
import { DateRange } from './date-range';
import { GuestsPanel, type Guests } from './guests-panel';
import { useDismiss } from './use-dismiss';
import { WhereField } from './where-field';

type Panel = 'where' | 'dates' | 'guests' | null;

/**
 * The hero search: Where, When, Who. It writes the search into the address and drops the visitor
 * onto the map of the stays below. Every popover grows from the field that opened it. The header's
 * compact search opens the same bar in a panel, and closes it on search (onSearched).
 */
export function SearchBar({ locale, options, onSearched }: { locale: Locale; options: WhereOption[]; onSearched?: () => void }) {
  const t = useTranslations('search');
  const id = useId();
  const current = useSearch();
  const form = useRef<HTMLFormElement>(null);
  const datesTrigger = useRef<HTMLButtonElement>(null);
  const guestsTrigger = useRef<HTMLButtonElement>(null);
  const datesPop = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState<Panel>(null);
  const [where, setWhere] = useState({ text: '', value: '' });
  const [dates, setDates] = useState({ checkin: '', checkout: '' });
  const [guests, setGuests] = useState<Guests>({ adults: 0, children: 0, infants: 0 });

  // The address is the source of truth: back, forward and shared links all land here.
  useEffect(() => {
    const option = options.find((o) => o.value === current.where);
    setWhere({ text: option ? option.label[locale] : current.where, value: option ? option.value : current.where });
    setDates({ checkin: current.checkin, checkout: current.checkout });
    setGuests({ adults: current.adults, children: current.children, infants: current.infants });
  }, [current, options, locale]);

  const dismiss = useCallback(
    (reason: 'outside' | 'escape') => {
      if (reason === 'escape') {
        if (open === 'dates') datesTrigger.current?.focus();
        if (open === 'guests') guestsTrigger.current?.focus();
      }
      setOpen(null);
    },
    [open],
  );
  useDismiss(form, open !== null, dismiss);

  // The dates panel spans the bar; its growth starts from the When field.
  useLayoutEffect(() => {
    if (open !== 'dates' || !datesPop.current || !datesTrigger.current) return;
    const pop = datesPop.current.getBoundingClientRect();
    const trigger = datesTrigger.current.getBoundingClientRect();
    datesPop.current.style.transformOrigin = `${trigger.left + trigger.width / 2 - pop.left}px 0`;
  }, [open]);

  // On a phone the calendar can open below the screen: bring an opened panel into view, keeping its
  // field visible above it. Inside the header's search panel, the panel scrolls, not the page behind.
  useEffect(() => {
    if (open !== 'dates' && open !== 'guests') return;
    const pop = document.getElementById(`${id}-${open}`);
    if (!pop) return;
    const frame = requestAnimationFrame(() => {
      const r = pop.getBoundingClientRect();
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const sheet = pop.closest('dialog');
      if (sheet) {
        const box = sheet.getBoundingClientRect();
        const below = r.bottom - (box.bottom - 16);
        if (below > 0) sheet.scrollBy({ top: Math.min(below, Math.max(0, r.top - box.top - 96)), behavior: reduce ? 'auto' : 'smooth' });
        return;
      }
      const below = r.bottom - (window.innerHeight - 16);
      if (below <= 0) return;
      const top = window.scrollY + Math.min(below, Math.max(0, r.top - 140));
      const smooth = lenis();
      if (smooth && !reduce) smooth.scrollTo(top);
      else window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, id]);

  const total = guests.adults + guests.children;
  const datesText = dates.checkin
    ? `${shortDate(locale, dates.checkin)} – ${dates.checkout ? shortDate(locale, dates.checkout) : '…'}`
    : t('addDates');
  const guestsText = total
    ? [
        t('guests', { count: total, countText: formatNumber(locale, total) }),
        guests.infants ? t('infantsCount', { count: guests.infants, countText: formatNumber(locale, guests.infants) }) : '',
      ]
        .filter(Boolean)
        .join(locale === 'ar' ? '، ' : ', ')
    : t('addGuests');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const typed = where.text.trim();
    // Typed but not picked: take the first suggestion it matches ("الساحل" → North Coast), else search the text.
    const query = normalize(typed);
    const best = query ? options.find((o) => matchesAll(o.keys, query)) : undefined;
    setSearch({
      where: where.value && where.text ? where.value : best?.value ?? typed,
      checkin: dates.checkin,
      checkout: dates.checkout,
      ...guests,
      collection: '',
    });
    setOpen(null);
    onSearched?.();
    requestMapView();
    scrollToSection('stays');
  };

  return (
    <form ref={form} className="search" role="search" aria-label={t('label')} onSubmit={submit}>
      <div className="search__field search__field--where">
        <label className="search__label" htmlFor={`${id}-where`}>
          {t('where')}
        </label>
        <WhereField
          id={`${id}-where`}
          locale={locale}
          options={options}
          text={where.text}
          open={open === 'where'}
          onOpen={(o) => setOpen(o ? 'where' : null)}
          onText={(text) => setWhere({ text, value: '' })}
          onPick={(option) => setWhere({ text: option.label[locale], value: option.value })}
        />
      </div>

      <div className="search__field search__field--dates">
        {/* A <label> for the button, so tapping the word opens the calendar too. */}
        <label className="search__label search__label--tap" id={`${id}-when`} htmlFor={`${id}-when-button`}>
          {t('when')}
        </label>
        <button
          ref={datesTrigger}
          id={`${id}-when-button`}
          type="button"
          className="search__input search__trigger tabular"
          aria-labelledby={`${id}-when ${id}-when-value`}
          aria-expanded={open === 'dates'}
          aria-controls={`${id}-dates`}
          data-empty={!dates.checkin || undefined}
          onClick={() => setOpen(open === 'dates' ? null : 'dates')}
        >
          <span id={`${id}-when-value`}>{datesText}</span>
        </button>
        <div
          ref={datesPop}
          id={`${id}-dates`}
          className="pop pop--dates"
          role="dialog"
          aria-label={t('when')}
          data-open={open === 'dates' || undefined}
        >
          <DateRange
            locale={locale}
            open={open === 'dates'}
            checkin={dates.checkin}
            checkout={dates.checkout}
            onChange={(checkin, checkout) => setDates({ checkin, checkout })}
            onDone={() => {
              setOpen(null);
              datesTrigger.current?.focus();
            }}
          />
        </div>
      </div>

      <div className="search__field search__field--guests">
        <label className="search__label search__label--tap" id={`${id}-who`} htmlFor={`${id}-who-button`}>
          {t('who')}
        </label>
        <button
          ref={guestsTrigger}
          id={`${id}-who-button`}
          type="button"
          className="search__input search__trigger tabular"
          aria-labelledby={`${id}-who ${id}-who-value`}
          aria-expanded={open === 'guests'}
          aria-controls={`${id}-guests`}
          data-empty={!total || undefined}
          onClick={() => setOpen(open === 'guests' ? null : 'guests')}
        >
          <span id={`${id}-who-value`}>{guestsText}</span>
        </button>
        <div id={`${id}-guests`} className="pop pop--guests" role="dialog" aria-label={t('who')} data-open={open === 'guests' || undefined}>
          <GuestsPanel
            locale={locale}
            guests={guests}
            onChange={(update) => setGuests(update)}
            onDone={() => {
              setOpen(null);
              guestsTrigger.current?.focus();
            }}
          />
        </div>
      </div>

      <button type="submit" className="btn btn--primary search__submit">
        {t('submit')}
      </button>
    </form>
  );
}
