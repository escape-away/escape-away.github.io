'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import { shortDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import type { WhereOption } from '@/lib/search-options';
import { lenis, useSearch } from '@/lib/search-state';
import { CloseIcon, SearchIcon } from '../explorer/icons';
import { SearchBar } from './search-bar';

/** The header's row height (min-h-16): the hero's search counts as gone once it slides under it. */
const HEADER = 64;

/**
 * Past the hero the search stays in reach: a pill in the header says what is being searched for
 * (place, dates, guests) and opens the same search bar in a panel under the header, a full screen on
 * phones. It shows once the hero's own search has scrolled away, and the hero stays the place to
 * search from while it is on screen.
 */
export function CompactSearch({ locale, options }: { locale: Locale; options: WhereOption[] }) {
  const t = useTranslations('search');
  const s = useSearch();
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [past, setPast] = useState(false);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setSlot(document.getElementById('header-search'));
    const hero = document.querySelector('.hero__text > .search');
    if (!hero) return;
    const io = new IntersectionObserver(
      ([entry]) => setPast(!entry.isIntersecting && entry.boundingClientRect.top < HEADER),
      { rootMargin: `-${HEADER}px 0px 0px 0px` },
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  // Escape closes an open calendar or list first; only the next one closes the panel. Read before
  // anything else sees the key (the bar's own handler closes the popover), wherever focus is.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    let keep = false;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') keep = d.open && Boolean(d.querySelector('.pop[data-open]'));
    };
    const onCancel = (e: Event) => {
      if (keep) e.preventDefault();
      keep = false;
    };
    const onClose = () => {
      lenis()?.start();
      setOpen(false);
    };
    document.addEventListener('keydown', onKey, true);
    d.addEventListener('cancel', onCancel);
    d.addEventListener('close', onClose);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      d.removeEventListener('cancel', onCancel);
      d.removeEventListener('close', onClose);
    };
  }, []);

  // Once the panel has rendered its bar: on a laptop the place takes focus, ready to type; on a
  // touch screen the panel itself does, so the keyboard doesn't cover the dates and guests.
  useEffect(() => {
    const d = dialog.current;
    if (!open || !d) return;
    const where = d.querySelector<HTMLInputElement>('.search__field--where input');
    if (where && window.matchMedia('(pointer: fine)').matches) where.focus();
    else d.focus();
  }, [open]);

  const show = () => {
    const d = dialog.current;
    if (!d || d.open) return;
    d.showModal();
    lenis()?.stop();
    setOpen(true);
  };
  // Smooth scrolling starts again before the bar scrolls the page to the stays.
  const hide = () => {
    lenis()?.start();
    dialog.current?.close();
  };

  const option = options.find((o) => o.value === s.where);
  const where = option ? option.label[locale] : s.where || t('anywhere');
  const dates = s.checkin
    ? `${shortDate(locale, s.checkin)} – ${s.checkout ? shortDate(locale, s.checkout) : '…'}`
    : t('addDates');
  const total = s.adults + s.children;
  const guests = total ? t('guests', { count: total, countText: formatNumber(locale, total) }) : t('addGuests');

  const pill =
    past || open || focused ? (
      <button
        type="button"
        className="compact-pill"
        aria-haspopup="dialog"
        onClick={show}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <span className="sr-only">{t('change')}: </span>
        {/* The spaces between the parts keep the button's name readable ("Anywhere Add dates …"); the
            flex row ignores them. */}
        <span className="compact-pill__text">
          <span className="compact-pill__where">{where}</span>{' '}
          <span className="compact-pill__more tabular">{dates}</span>{' '}
          <span className="compact-pill__more">{guests}</span>
        </span>
        <span className="compact-pill__icon">
          <SearchIcon />
        </span>
      </button>
    ) : null;

  return (
    <>
      {slot && pill ? createPortal(pill, slot) : null}
      <dialog
        ref={dialog}
        className="compact-search"
        aria-labelledby={`${id}-title`}
        tabIndex={-1}
        data-lenis-prevent
        onClick={(e) => {
          if (e.target === e.currentTarget) hide();
        }}
      >
        <div className="compact-search__inner wrap">
          <div className="compact-search__head">
            <h2 id={`${id}-title`} className="compact-search__title">
              {t('label')}
            </h2>
            <button type="button" className="compact-search__close" aria-label={t('close')} title={t('close')} onClick={hide}>
              <CloseIcon />
            </button>
          </div>
          <div className="compact-search__bar">{open ? <SearchBar locale={locale} options={options} onSearched={hide} /> : null}</div>
        </div>
      </dialog>
    </>
  );
}
