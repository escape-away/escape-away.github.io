'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import { calendarFormat, fromISO, nightsBetween, shortDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { lenis, setSearch, updateSearch, useSearch } from '@/lib/search-state';
import { whatsappLink } from '@/lib/site';
import { CloseIcon } from '../explorer/icons';
import { DateRange } from '../search/date-range';
import { GuestsPanel, type Guests } from '../search/guests-panel';
import { useDismiss } from '../search/use-dismiss';
import { RequestDialog, type RequestDialogHandle } from './request-dialog';

type Props = {
  code: string;
  name: string;
  /** "From EGP 4,500 a night", or "Price on request" until there is a price. */
  price: string;
  /** How many guests the home sleeps. */
  capacity: number;
};

/**
 * Request to book. Dates and guests come in from the search and are written back into the address as
 * they change, so nothing is typed twice. With dates chosen, "Request to book" opens the short request
 * form (RequestDialog): the request goes to the team's sheet, then on to WhatsApp with the home, its
 * code, the dates and the guests already written. Beside the page from laptops up; a bar pinned to
 * the bottom on phones, which opens a sheet for the dates and guests.
 */
export function RequestPanel({ code, name, price, capacity }: Props) {
  const t = useTranslations('listing');
  const ts = useTranslations('search');
  const tStays = useTranslations('stays');
  const locale = useLocale() as Locale;
  const s = useSearch();
  const id = useId();
  const n = (v: number) => formatNumber(locale, v);

  const card = useRef<HTMLDivElement>(null);
  const datesTrigger = useRef<HTMLButtonElement>(null);
  const guestsTrigger = useRef<HTMLButtonElement>(null);
  const datesPop = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const sheetOpener = useRef<HTMLElement | null>(null);
  const barSummary = useRef<HTMLButtonElement>(null);
  const requestDialog = useRef<RequestDialogHandle>(null);
  /** The phone sheet is handing over to the request form: its close shouldn't move focus or restart scrolling. */
  const handoff = useRef(false);
  const [open, setOpen] = useState<'dates' | 'guests' | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const guests: Guests = { adults: s.adults, children: s.children, infants: s.infants };
  const party = s.adults + s.children;
  const hasDates = Boolean(s.checkin && s.checkout);
  const nights = hasDates ? nightsBetween(s.checkin, s.checkout) : 0;

  const setDates = (checkin: string, checkout: string) => setSearch({ checkin, checkout }, { replace: true });
  const setGuests = (update: (previous: Guests) => Guests) =>
    updateSearch((cur) => update({ adults: cur.adults, children: cur.children, infants: cur.infants }), { replace: true });

  const datesText = s.checkin
    ? `${shortDate(locale, s.checkin)} – ${s.checkout ? shortDate(locale, s.checkout) : '…'}`
    : ts('addDates');
  const guestsText = party
    ? [
        ts('guests', { count: party, countText: n(party) }),
        s.infants ? ts('infantsCount', { count: s.infants, countText: n(s.infants) }) : '',
      ]
        .filter(Boolean)
        .join(locale === 'ar' ? '، ' : ', ')
    : ts('addGuests');

  // The message the team receives on WhatsApp: the home, its code, the dates and the guests.
  const longDate = (iso: string) =>
    calendarFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(fromISO(iso));
  const comma = locale === 'ar' ? '، ' : ', ';
  const messageStart = hasDates
    ? [
        t('requestHello', { name, code }),
        t('requestDates', {
          from: longDate(s.checkin),
          to: longDate(s.checkout),
          nights: ts('nights', { count: nights, countText: n(nights) }),
        }),
        party ? t('requestGuests', { guests: guestsText }) : '',
      ]
        .filter(Boolean)
        .join(comma)
    : '';
  const ask = whatsappLink(tStays('whatsappText', { name, code }));
  const tooMany = party > capacity;

  // ---------- The card's popovers (laptops up) ----------
  const dismiss = useCallback(
    (reason: 'outside' | 'escape') => {
      if (reason === 'escape') (open === 'dates' ? datesTrigger : guestsTrigger).current?.focus();
      setOpen(null);
    },
    [open],
  );
  useDismiss(card, open !== null, dismiss);

  // The calendar is wider than the card; it still grows from the field that opened it.
  useLayoutEffect(() => {
    if (open !== 'dates' || !datesPop.current || !datesTrigger.current) return;
    const pop = datesPop.current.getBoundingClientRect();
    const trigger = datesTrigger.current.getBoundingClientRect();
    datesPop.current.style.transformOrigin = `${trigger.left + trigger.width / 2 - pop.left}px 0`;
  }, [open]);

  // ---------- The sheet (phones) ----------
  const openSheet = (from: HTMLElement) => {
    const d = sheet.current;
    if (!d || d.open) return;
    sheetOpener.current = from;
    d.showModal();
    lenis()?.stop();
    setSheetOpen(true);
  };
  useEffect(() => {
    const d = sheet.current;
    if (!d) return;
    const onClose = () => {
      setSheetOpen(false);
      if (handoff.current) {
        handoff.current = false;
        return;
      }
      lenis()?.start();
      sheetOpener.current?.focus();
    };
    d.addEventListener('close', onClose);
    return () => d.removeEventListener('close', onClose);
  }, []);

  // ---------- The request form ----------
  const openRequest = (from: HTMLElement | null) => requestDialog.current?.open(from);
  /** From the phone sheet: the form takes over, and focus comes back to the bar when it closes. */
  const requestFromSheet = () => {
    handoff.current = true;
    sheet.current?.close();
    openRequest(barSummary.current);
  };
  /** "Change dates or guests" in the form: back to the card's calendar, or the phone sheet. */
  const changeFromRequest = () => {
    if (window.matchMedia('(min-width: 64rem)').matches) {
      setOpen('dates');
      requestAnimationFrame(() => datesTrigger.current?.focus());
    } else if (barSummary.current) openSheet(barSummary.current);
  };

  const primary = (where: 'card' | 'bar') =>
    hasDates ? (
      <button type="button" className="btn btn--primary request__go" onClick={(e) => openRequest(e.currentTarget)}>
        {t('requestToBook')}
      </button>
    ) : (
      <button
        type="button"
        className="btn btn--primary request__go"
        onClick={(e) => (where === 'card' ? setOpen('dates') : openSheet(e.currentTarget))}
      >
        {t('addYourDates')}
      </button>
    );

  return (
    <>
      <div ref={card} className="request-card" aria-labelledby={`${id}-price`} role="group">
        <p id={`${id}-price`} className="request__price tabular">
          {price}
        </p>

        <div className="request__fields">
          <div className="request__field">
            <span className="request__label" id={`${id}-when`}>
              {ts('when')}
            </span>
            <button
              ref={datesTrigger}
              type="button"
              className="request__trigger tabular"
              aria-labelledby={`${id}-when ${id}-when-value`}
              aria-expanded={open === 'dates'}
              aria-controls={`${id}-dates`}
              data-empty={!s.checkin || undefined}
              onClick={() => setOpen(open === 'dates' ? null : 'dates')}
            >
              <span id={`${id}-when-value`}>{datesText}</span>
            </button>
            <div
              ref={datesPop}
              id={`${id}-dates`}
              className="pop pop--dates request__pop"
              role="dialog"
              aria-label={ts('when')}
              data-open={open === 'dates' || undefined}
            >
              <DateRange
                locale={locale}
                open={open === 'dates'}
                checkin={s.checkin}
                checkout={s.checkout}
                onChange={setDates}
                onDone={() => {
                  setOpen(null);
                  datesTrigger.current?.focus();
                }}
              />
            </div>
          </div>
          <div className="request__field">
            <span className="request__label" id={`${id}-who`}>
              {ts('who')}
            </span>
            <button
              ref={guestsTrigger}
              type="button"
              className="request__trigger tabular"
              aria-labelledby={`${id}-who ${id}-who-value`}
              aria-expanded={open === 'guests'}
              aria-controls={`${id}-guests`}
              data-empty={!party || undefined}
              onClick={() => setOpen(open === 'guests' ? null : 'guests')}
            >
              <span id={`${id}-who-value`}>{guestsText}</span>
            </button>
            <div
              id={`${id}-guests`}
              className="pop pop--guests request__pop"
              role="dialog"
              aria-label={ts('who')}
              data-open={open === 'guests' || undefined}
            >
              <GuestsPanel
                locale={locale}
                guests={guests}
                onChange={setGuests}
                onDone={() => {
                  setOpen(null);
                  guestsTrigger.current?.focus();
                }}
              />
            </div>
          </div>
        </div>

        {hasDates ? (
          <p className="request__nights tabular">{ts('nights', { count: nights, countText: n(nights) })}</p>
        ) : null}
        {tooMany ? (
          <p className="request__warn" role="status">
            {t('capacity', { count: capacity, countText: n(capacity) })}
          </p>
        ) : null}

        {primary('card')}
        <p className="request__note">{t('noPayYet')}</p>
        <a href={ask} target="_blank" rel="noopener" className="link-btn request__ask">
          {tStays('ask')}
        </a>
      </div>

      {/* Phones: the bar pinned to the bottom, and the sheet it opens. */}
      <div className="request-bar">
        <button ref={barSummary} type="button" className="request-bar__summary" onClick={(e) => openSheet(e.currentTarget)}>
          <span className="request-bar__price tabular">{price}</span>
          <span className="request-bar__when tabular">
            {hasDates ? [datesText, party ? guestsText : ''].filter(Boolean).join(' · ') : t('addYourDates')}
          </span>
          {/* The party is bigger than the home: said here too, not only inside the sheet. */}
          {tooMany ? (
            <span className="request-bar__warn">{t('capacityBar', { count: capacity, countText: n(capacity) })}</span>
          ) : null}
        </button>
        {primary('bar')}
      </div>

      <dialog
        ref={sheet}
        className="sheet"
        aria-labelledby={`${id}-sheet-title`}
        data-lenis-prevent
        onClick={(e) => {
          if (e.target === e.currentTarget) sheet.current?.close();
        }}
      >
        <div className="sheet__inner">
          <div className="sheet__head">
            <h2 id={`${id}-sheet-title`} className="sheet__title">
              {t('sheetTitle')}
            </h2>
            <button type="button" className="sheet__close" aria-label={t('closeSheet')} title={t('closeSheet')} onClick={() => sheet.current?.close()}>
              <CloseIcon />
            </button>
          </div>
          <div className="sheet__body">
            <DateRange
              locale={locale}
              open={sheetOpen}
              checkin={s.checkin}
              checkout={s.checkout}
              onChange={setDates}
              onDone={() => sheet.current?.close()}
            />
            <GuestsPanel locale={locale} guests={guests} onChange={setGuests} />
            {tooMany ? (
              <p className="request__warn" role="status">
                {t('capacity', { count: capacity, countText: n(capacity) })}
              </p>
            ) : null}
          </div>
          <div className="sheet__foot">
            <p className="request__note">{t('noPayYet')}</p>
            {hasDates ? (
              <button type="button" className="btn btn--primary" onClick={requestFromSheet}>
                {t('requestToBook')}
              </button>
            ) : null}
          </div>
        </div>
      </dialog>

      <RequestDialog
        ref={requestDialog}
        code={code}
        home={name}
        capacity={capacity}
        checkin={s.checkin}
        checkout={s.checkout}
        adults={s.adults}
        children={s.children}
        infants={s.infants}
        guestsText={guestsText}
        messageStart={messageStart}
        onChange={changeFromRequest}
      />
    </>
  );
}
