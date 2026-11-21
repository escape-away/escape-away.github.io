'use client';

import { Children, memo, useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import { matches, whereKind, type ExplorerItem, type FilterOptions, type Option } from '@/lib/explorer';
import { onMapViewRequest } from '@/lib/explorer-view';
import { formatNumber } from '@/lib/format';
import { normalize } from '@/lib/normalize';
import { useSaved } from '@/lib/saved';
import { clearFilters, clearSearch, filterCount, scrollToElement, searchQuery, setSearch, useSearch, type SearchState } from '@/lib/search-state';
import { whatsappLink } from '@/lib/site';
import { FilterSheet } from './filter-sheet';
import { CloseIcon, HeartIcon, ListIcon, MapIcon } from './icons';
import { StaysMap } from './stays-map';

/** Cards shown before "Show more": four rows beside the map. */
const PAGE = 8;

/**
 * One card's place in the list. Memoised, so a filter or a hover re-renders only the cards whose
 * visibility or highlight changed, never the whole list (with 400 stays that is the difference
 * between an instant tap and a laggy one).
 */
const CardSlot = memo(function CardSlot({
  slug,
  visible,
  lit,
  onHover,
  children,
}: {
  slug: string;
  visible: boolean;
  lit: boolean;
  onHover: Dispatch<SetStateAction<string | null>>;
  children: ReactNode;
}) {
  return (
    <div
      className="explorer__card"
      hidden={!visible}
      data-lit={lit || undefined}
      onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(slug)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && onHover(null)}
      onFocus={() => onHover(slug)}
      onBlur={() => onHover(null)}
    >
      {children}
    </div>
  );
});

export type Area = Option & { center: [number, number]; zoom: number };

type Props = {
  items: ExplorerItem[];
  /** The five destinations, for the area chips, with the map view of each. */
  areas: Area[];
  /** Compound names in the page's language, keyed by the English name the units use. */
  compounds: Record<string, string>;
  options: FilterOptions;
  /** The server-rendered cards, one per item and in the same order. */
  children: ReactNode;
};

/**
 * The stays explorer: the search's result as a list and a map that always show the same stays, the
 * five areas one tap away, and the filters. Each card and its pin light up together. On phones one
 * floating button switches between the list and the map; a search from the hero lands on the map.
 */
export function StaysExplorer({ items, areas, compounds, options, children }: Props) {
  const t = useTranslations('explorer');
  const ts = useTranslations('staysSection');
  const locale = useLocale() as Locale;
  const s = useSearch();
  const tSaved = useTranslations('saved');

  // Saved stays, kept on this device. The chip shows only those; the list it shows is fixed when it
  // is turned on, so un-hearting a stay there doesn't pull the card (and the focus) out from under you.
  const saved = useSaved();
  const savedHere = useMemo(() => items.filter((item) => saved.includes(item.slug)).length, [items, saved]);
  const [savedView, setSavedView] = useState<readonly string[] | null>(null);

  const kind = whereKind(s.where, areas.map((a) => a.value), Object.keys(compounds));
  const query = normalize(s.where);
  const fits = useMemo(
    () => items.map((item) => matches(item, s, kind, query) && (!savedView || savedView.includes(item.slug))),
    [items, s, kind, query, savedView],
  );
  const matching = useMemo(() => items.filter((_, i) => fits[i]), [items, fits]);
  // How many stays a filter choice would leave, so the sheet can show it on each chip.
  const countWith = useCallback(
    (change: Partial<SearchState>) => {
      const next = { ...s, ...change };
      let n = 0;
      for (const item of items) if (matches(item, next, kind, query) && (!savedView || savedView.includes(item.slug))) n++;
      return n;
    },
    [items, s, kind, query, savedView],
  );
  const count = matching.length;
  const filters = filterCount(s);
  const searching = Boolean(s.where || s.collection || s.adults + s.children || filters);
  /** A place, collection or party is set: "Clear search" has something besides the filters to clear. */
  const placeOrParty = Boolean(s.where || s.collection || s.adults + s.children);

  // What decides the matching set; dates and infants don't, so they never re-frame the map.
  const setKey = searchQuery({ ...s, checkin: '', checkout: '', infants: 0 }) + (savedView ? `|saved:${savedView.join(',')}` : '');
  const [paging, setPaging] = useState({ key: setKey, limit: PAGE });
  const limit = paging.key === setKey ? paging.limit : PAGE;

  const [listHover, setListHover] = useState<string | null>(null);
  const [mapHover, setMapHover] = useState<string | null>(null);
  const [selectedSlug, setSelected] = useState<string | null>(null);
  const selected = selectedSlug && matching.some((i) => i.slug === selectedSlug) ? selectedSlug : null;

  const [view, setView] = useState<'list' | 'map'>('list');
  const root = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      onMapViewRequest(() => {
        setView('map');
        // Where the list and the map take turns, land on the map itself rather than the section's title.
        if (window.matchMedia('(max-width: 63.99rem)').matches) {
          requestAnimationFrame(() => root.current && scrollToElement(root.current, 16));
        }
      }),
    [],
  );

  // The floating switch shows while the list or the map is on screen (phones and tablets only, by CSS).
  const body = useRef<HTMLDivElement>(null);
  const [switchShown, setSwitchShown] = useState(false);
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setSwitchShown(entry.isIntersecting), {
      rootMargin: '-30% 0px -15% 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const switchView = () => {
    setView((v) => (v === 'list' ? 'map' : 'list'));
    if (root.current) scrollToElement(root.current, 16);
  };

  // "Show more" moves focus to the first new card, so keyboard users carry on from there.
  const grid = useRef<HTMLDivElement>(null);
  const focusFrom = useRef<number | null>(null);
  useEffect(() => {
    const from = focusFrom.current;
    if (from == null || !grid.current) return;
    focusFrom.current = null;
    grid.current.querySelectorAll<HTMLElement>('.explorer__card:not([hidden]) a')[from]?.focus();
  }, [limit]);

  // Keyed once per render of the server's cards, so each slot keeps the same card element.
  const cards = useMemo(() => Children.toArray(children), [children]);
  let shown = 0;

  const whereChip =
    kind === 'compound' ? compounds[s.where] ?? s.where : kind === 'text' ? `“${s.where}”` : null;

  // One main button, the first that applies; the rest are links.
  const emptyFixes = [
    savedView ? { key: 'saved', label: tSaved('showAll'), run: () => setSavedView(null) } : null,
    filters ? { key: 'filters', label: t('clearFilters'), run: clearFilters } : null,
    placeOrParty ? { key: 'search', label: ts('clear'), run: clearSearch } : null,
  ].filter((fix) => fix !== null);
  const emptyActions = (
    <div className="explorer__empty-actions">
      {emptyFixes.map((fix, i) => (
        <button key={fix.key} type="button" className={i === 0 ? 'btn btn--primary' : 'link-btn'} onClick={fix.run}>
          {fix.label}
        </button>
      ))}
      <a href={whatsappLink(t('whatsappText'))} target="_blank" rel="noopener" className="link-btn">
        {t('askWhatsapp')}
      </a>
    </div>
  );

  return (
    <div ref={root} className="explorer" data-view={view}>
      <div className="explorer__bar">
        <FilterSheet options={options} count={count} countWith={countWith} />
        {savedHere || savedView ? (
          <button
            type="button"
            className="chip chip--saved"
            aria-pressed={savedView !== null}
            onClick={() => setSavedView(savedView ? null : saved)}
          >
            <HeartIcon />
            <span>{tSaved('chip')}</span>
            <span className="tabular">{formatNumber(locale, savedHere)}</span>
          </button>
        ) : null}
        <div className="explorer__areas" role="group" aria-label={t('areas')}>
          {whereChip ? (
            <button
              type="button"
              className="chip"
              aria-pressed="true"
              aria-label={t('clearWhere', { name: whereChip })}
              onClick={() => setSearch({ where: '' })}
            >
              <span className="chip__text">{whereChip}</span>
              <CloseIcon className="chip__x" />
            </button>
          ) : null}
          <button type="button" className="chip" aria-pressed={!s.where} onClick={() => setSearch({ where: '' })}>
            {t('allAreas')}
          </button>
          {areas.map((a) => (
            <button
              key={a.value}
              type="button"
              className="chip"
              aria-pressed={s.where === a.value}
              onClick={() => setSearch({ where: s.where === a.value ? '' : a.value })}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="explorer__status">
        {/* When nothing matches, the panel below says so; this line stays for screen readers. */}
        <p className={count ? 'tabular' : 'sr-only'} aria-live="polite">
          {savedView && !searching
            ? tSaved('count', { count, countText: formatNumber(locale, count) })
            : searching
              ? ts('matching', { count, countText: formatNumber(locale, count) })
              : ts('all', { count, countText: formatNumber(locale, count) })}
        </p>
        {searching && count ? (
          <button type="button" className="link-btn" onClick={clearSearch}>
            {ts('clear')}
          </button>
        ) : null}
      </div>
      {s.checkin && s.checkout ? <p className="explorer__note">{ts('datesNote')}</p> : null}
      {savedView ? <p className="explorer__note">{tSaved('onlyHere')}</p> : null}

      <div ref={body} className="explorer__body">
        <div className="explorer__list" id="explorer-list">
          <div ref={grid} className="explorer__grid">
            {cards.map((card, i) => {
              const item = items[i];
              if (!item) return null;
              const position = fits[i] ? shown++ : -1;
              const visible = position >= 0 && position < limit;
              const lit = item.slug === mapHover || item.slug === selected;
              return (
                <CardSlot key={item.slug} slug={item.slug} visible={visible} lit={lit} onHover={setListHover}>
                  {card}
                </CardSlot>
              );
            })}
          </div>

          {count > limit ? (
            <div className="explorer__more">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => {
                  focusFrom.current = limit;
                  setPaging({ key: setKey, limit: limit + PAGE });
                }}
              >
                {t('showMore', { count: count - limit, countText: formatNumber(locale, count - limit) })}
              </button>
            </div>
          ) : null}

          {count === 0 ? (
            <div className="explorer__empty">
              <p className="explorer__empty-title">
                {savedView ? tSaved('emptyTitle') : filters ? t('emptyTitle') : ts('matching', { count: 0, countText: '0' })}
              </p>
              <p className="explorer__empty-text">{t('emptyText')}</p>
              {emptyActions}
            </div>
          ) : null}
        </div>

        <div className="explorer__map" id="explorer-map">
          <StaysMap
            items={matching}
            fitKey={setKey}
            area={kind === 'destination' ? areas.find((a) => a.value === s.where) ?? null : null}
            selected={selected}
            linked={listHover}
            onSelect={setSelected}
            onHover={setMapHover}
            empty={
              <>
                <p className="map-empty__text">
                  {savedView ? tSaved('emptyTitle') : filters ? t('emptyTitle') : ts('matching', { count: 0, countText: '0' })}
                </p>
                {emptyFixes[0] ? (
                  <button type="button" className="btn btn--primary btn--small" onClick={emptyFixes[0].run}>
                    {emptyFixes[0].label}
                  </button>
                ) : null}
              </>
            }
            fallback={
              <button type="button" className="link-btn explorer__to-list" onClick={() => setView('list')}>
                {t('showList')}
              </button>
            }
          />
        </div>
      </div>

      <button
        type="button"
        className="btn btn--primary explorer__switch"
        data-shown={switchShown || undefined}
        aria-controls="explorer-list explorer-map"
        onClick={switchView}
      >
        {view === 'list' ? <MapIcon /> : <ListIcon />}
        {view === 'list' ? t('showMap') : t('showList')}
      </button>
    </div>
  );
}
