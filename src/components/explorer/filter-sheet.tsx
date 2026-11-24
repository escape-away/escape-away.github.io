'use client';

import { memo, useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import type { FilterOptions } from '@/lib/explorer';
import { formatNumber, formatUsd } from '@/lib/format';
import { clearFilters, filterCount, lenis, setSearch, useSearch, type SearchState } from '@/lib/search-state';
import { useDismiss } from '../search/use-dismiss';
import { CloseIcon, FiltersIcon } from './icons';

type Reason = 'outside' | 'escape' | 'button' | 'done' | 'toggle';

type Props = {
  options: FilterOptions;
  count: number;
  /** How many stays the search would show with this change: each choice says what it leaves. */
  countWith: (change: Partial<SearchState>) => number;
};

/**
 * The filters. On wider screens a panel grows from its button over the list, so the map beside it
 * shows pins leaving and coming back as each filter changes. On phones it is a sheet from the bottom.
 * Every change applies at once and is written into the address. Each choice shows how many stays it
 * would leave, and a choice that would leave none is drawn quieter, so dead ends show before a tap.
 * Memoised: a hover in the list doesn't redraw the sheet.
 */
export const FilterSheet = memo(function FilterSheet({ options, count, countWith }: Props) {
  const t = useTranslations('explorer');
  const locale = useLocale() as Locale;
  const s = useSearch();
  const id = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef(true);
  const showButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const active = filterCount(s);
  const none = count === 0 && active > 0;

  // Counted as the search changes, so opening the sheet has nothing to add but the sheet itself.
  const counts = useMemo(() => {
    return {
      types: Object.fromEntries(options.types.map((o) => [o.value, countWith({ types: [o.value] })])),
      bedrooms: Object.fromEntries([0, ...options.bedrooms].map((n) => [n, countWith({ bedrooms: n })])),
      amenities: Object.fromEntries(
        options.amenities.map((o) => [
          o.value,
          countWith({ amenities: s.amenities.includes(o.value) ? s.amenities : [...s.amenities, o.value] }),
        ]),
      ),
    };
  }, [options, countWith, s.amenities]);
  const stays = (n: number | undefined) =>
    n == null ? null : (
      <span className="chip__n tabular">
        <span aria-hidden="true">{formatNumber(locale, n)}</span>
        <span className="sr-only">, {t('optionCount', { count: n, countText: formatNumber(locale, n) })}</span>
      </span>
    );

  const close = useCallback((reason: Reason) => {
    const d = dialog.current;
    if (!d?.open) return;
    // Clicking elsewhere hands focus to what was clicked; every other way out returns it to the button.
    returnFocus.current = reason !== 'outside';
    d.close();
  }, []);

  const show = () => {
    const d = dialog.current;
    if (!d || d.open) return;
    const asSheet = !window.matchMedia('(min-width: 48rem)').matches;
    setModal(asSheet);
    // Set before it opens and kept while it closes, so the sheet slides both ways.
    d.toggleAttribute('data-sheet', asSheet);
    // The first choice carries autofocus, so opening the dialog focuses it in the same step; a second
    // focus() here forced the page through layout again before the sheet could paint.
    if (asSheet) {
      d.showModal();
      lenis()?.stop();
    } else d.show();
    setOpen(true);
    if (!d.contains(document.activeElement)) d.querySelector<HTMLElement>('[autofocus]')?.focus();
  };

  // The first choice in the sheet is where focus lands when it opens.
  useEffect(() => {
    dialog.current?.querySelector('input, button:not(.filters__close)')?.setAttribute('autofocus', '');
  }, []);

  // A first opening cost twice a later one: the sheet's styles, words and layout were all new to the
  // browser. When the list comes near the screen and the page is idle, the sheet is laid out once, out
  // of sight and with no transition, so the first tap opens it like any later one.
  useEffect(() => {
    const d = dialog.current;
    const near = wrap.current;
    if (!d || !near || !('IntersectionObserver' in window)) return;
    let idle = 0;
    // Safari has no idle callback; a short timer stands in.
    const canIdle = typeof (window as Partial<Window>).requestIdleCallback === 'function';
    const warm = () => {
      if (d.open) return;
      d.toggleAttribute('data-sheet', !window.matchMedia('(min-width: 48rem)').matches);
      d.style.transition = 'none';
      d.setAttribute('data-warm', '');
      void d.offsetHeight;
      d.removeAttribute('data-warm');
      void d.offsetHeight;
      d.style.transition = '';
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        idle = canIdle ? window.requestIdleCallback(warm, { timeout: 3000 }) : window.setTimeout(warm, 1200);
      },
      { rootMargin: '100% 0px' },
    );
    io.observe(near);
    return () => {
      io.disconnect();
      if (canIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onClose = () => {
      setOpen(false);
      lenis()?.start();
      if (returnFocus.current) trigger.current?.focus();
      returnFocus.current = true;
    };
    d.addEventListener('close', onClose);
    return () => d.removeEventListener('close', onClose);
  }, []);

  // The panel closes on a click outside it or on Escape; the sheet has the browser's own Escape.
  const dismiss = useCallback((reason: 'outside' | 'escape') => close(reason), [close]);
  useDismiss(wrap, open && !modal, dismiss);

  const toggleIn = <T extends string>(list: T[], value: T, order: readonly { value: T }[]) => {
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    return order.map((o) => o.value).filter((v) => next.includes(v));
  };

  const onPrice = (key: 'priceMin' | 'priceMax') => (e: ChangeEvent<HTMLSelectElement>) =>
    setSearch({ [key]: Number(e.target.value) || 0 }, { replace: true });

  return (
    <div ref={wrap} className="filters-anchor">
      <button
        ref={trigger}
        type="button"
        className="chip chip--filters"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => (open ? close('toggle') : show())}
      >
        <FiltersIcon />
        <span>{t('filters')}</span>
        {active ? (
          <span className="chip__count tabular">
            <span className="sr-only">{t('filtersOn', { count: active, countText: formatNumber(locale, active) })}</span>
            <span aria-hidden="true">{formatNumber(locale, active)}</span>
          </span>
        ) : null}
      </button>

      <dialog
        ref={dialog}
        id={id}
        className="filters"
        aria-labelledby={`${id}-title`}
        data-lenis-prevent
        onClick={(e) => {
          // The sheet's backdrop is the dialog itself; its content sits in .filters__inner.
          if (modal && e.target === e.currentTarget) close('outside');
        }}
      >
        <div className="filters__inner">
          <div className="filters__head">
            <h3 id={`${id}-title`} className="filters__title">
              {t('filtersTitle')}
            </h3>
            <button type="button" className="filters__close" aria-label={t('close')} title={t('close')} onClick={() => close('button')}>
              <CloseIcon />
            </button>
          </div>

          <div className="filters__body">
            {options.types.length > 1 ? (
              <fieldset className="filters__group">
                <legend className="filters__legend">{t('type')}</legend>
                <div className="chips">
                  {options.types.map((o) => (
                    <label key={o.value} className="chip" data-none={counts.types[o.value] === 0 || undefined}>
                      <input
                        type="checkbox"
                        name="type"
                        value={o.value}
                        checked={s.types.includes(o.value)}
                        onChange={() => setSearch({ types: toggleIn(s.types, o.value, options.types) }, { replace: true })}
                      />
                      <span>{o.label}</span>
                      {stays(counts.types[o.value])}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <fieldset className="filters__group">
              <legend className="filters__legend">{t('bedrooms')}</legend>
              <div className="chips">
                {[0, ...options.bedrooms].map((n) => (
                  <label key={n} className="chip chip--short" data-none={counts.bedrooms[n] === 0 || undefined}>
                    <input
                      type="radio"
                      name="bedrooms"
                      value={n}
                      checked={s.bedrooms === n}
                      onChange={() => setSearch({ bedrooms: n }, { replace: true })}
                    />
                    <span className="tabular">
                      {n ? (
                        <>
                          <span aria-hidden="true" dir="ltr">
                            {formatNumber(locale, n)}+
                          </span>
                          <span className="sr-only">{t('bedroomsAtLeast', { count: n, countText: formatNumber(locale, n) })}</span>
                        </>
                      ) : (
                        t('anyBedrooms')
                      )}
                    </span>
                    {stays(counts.bedrooms[n])}
                  </label>
                ))}
              </div>
            </fieldset>

            {options.amenities.length ? (
              <fieldset className="filters__group">
                <legend className="filters__legend">{t('amenities')}</legend>
                <div className="chips">
                  {options.amenities.map((o) => (
                    <label key={o.value} className="chip" data-none={counts.amenities[o.value] === 0 || undefined}>
                      <input
                        type="checkbox"
                        name="amenities"
                        value={o.value}
                        checked={s.amenities.includes(o.value)}
                        onChange={() =>
                          setSearch({ amenities: toggleIn(s.amenities, o.value, options.amenities) }, { replace: true })
                        }
                      />
                      <span>{o.label}</span>
                      {stays(counts.amenities[o.value])}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {options.prices.length ? (
              <fieldset className="filters__group">
                <legend className="filters__legend">{t('price')}</legend>
                <div className="filters__prices">
                  <label className="filters__field">
                    <span className="filters__label">{t('priceMin')}</span>
                    <select name="min" className="filters__select tabular" value={s.priceMin} onChange={onPrice('priceMin')}>
                      <option value={0}>{t('noMin')}</option>
                      {options.prices
                        .filter((p) => !s.priceMax || p <= s.priceMax)
                        .map((p) => (
                          <option key={p} value={p}>
                            {formatUsd(locale, p)}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="filters__field">
                    <span className="filters__label">{t('priceMax')}</span>
                    <select name="max" className="filters__select tabular" value={s.priceMax} onChange={onPrice('priceMax')}>
                      <option value={0}>{t('noMax')}</option>
                      {options.prices
                        .filter((p) => !s.priceMin || p >= s.priceMin)
                        .map((p) => (
                          <option key={p} value={p}>
                            {formatUsd(locale, p)}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
                <p className="filters__note">{t('pricesNote')}</p>
              </fieldset>
            ) : null}
          </div>

          {/* Nothing matches: clearing the filters becomes the one button, beside what it fixes. The
              Clear button keeps its place in both states, so focus stays put; once it has cleared,
              focus moves on to Show stays. */}
          <div className="filters__foot">
            {none ? <p className="filters__none">{t('showStays', { count: 0, countText: formatNumber(locale, 0) })}</p> : null}
            <button
              type="button"
              className={none ? 'btn btn--primary' : 'link-btn'}
              onClick={() => {
                clearFilters();
                requestAnimationFrame(() => showButton.current?.focus());
              }}
              disabled={!active}
            >
              {t('clearFilters')}
            </button>
            {none ? null : (
              <button ref={showButton} type="button" className="btn btn--primary" onClick={() => close('done')}>
                {t('showStays', { count, countText: formatNumber(locale, count) })}
              </button>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
});
