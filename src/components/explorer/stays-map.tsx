'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';
import Supercluster from 'supercluster';
import type { Locale } from '@/i18n/routing';
import type { ExplorerItem } from '@/lib/explorer';
import { formatNumber } from '@/lib/format';
import { CarryLink } from '../carry-link';
import { EaMark } from '../ea-mark';
import { SlotImage } from '../slot-image';
import { CloseIcon, FitIcon, MinusIcon, PlusIcon } from './icons';
import {
  loadEngine,
  MAX_ZOOM,
  webglAvailable,
  type Bounds,
  type Engine,
  type EngineMap,
  type EngineMarker,
  type LngLat,
  type Padding,
} from './map-engine';

type Status = 'waiting' | 'loading' | 'ready' | 'error' | 'unsupported';
type Live = { engine: Engine; map: EngineMap };
type Leaf = { slug: string };
type Spot = { item: ExplorerItem; lngLat: LngLat };

type Props = {
  /** The stays that match, in list order. */
  items: ExplorerItem[];
  /** Changes whenever the search or a filter changes; the map then frames the stays that match. */
  fitKey: string;
  /** The destination searched for, if any: where the map goes when nothing there matches. */
  area: { center: LngLat; zoom: number } | null;
  selected: string | null;
  /** The stay hovered or focused in the list, raised on the map. */
  linked: string | null;
  onSelect: (slug: string | null) => void;
  onHover: (slug: string | null) => void;
  /** Shown on the map when nothing matches. */
  empty?: ReactNode;
  /** Shown beside the map's error, e.g. a way back to the list on phones. */
  fallback?: ReactNode;
  /**
   * The closest the map zooms when it frames the stays. The explorer keeps to a neighbourhood; a
   * destination page passes its area's zoom, so one stay still shows the whole area around it.
   */
  fitZoom?: number;
};

/** The corner of Egypt the five destinations sit in, framed before anything has a pin. */
const EGYPT: Bounds = [
  [28.4, 27.0],
  [34.0, 31.3],
];

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const duration = (ms: number) => (reduceMotion() ? 0 : ms);

/** Stays that share a pin are spread around it, so each keeps its own marker. Pins are approximate anyway. */
function spread(items: ExplorerItem[]): Spot[] {
  const groups = new Map<string, ExplorerItem[]>();
  for (const item of items) {
    if (!item.lngLat) continue;
    const key = item.lngLat.map((v) => v.toFixed(4)).join(',');
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const spots: Spot[] = [];
  for (const group of groups.values()) {
    group.forEach((item, i) => {
      const [lng, lat] = item.lngLat!;
      if (group.length === 1) {
        spots.push({ item, lngLat: [lng, lat] });
        return;
      }
      const angle = (2 * Math.PI * i) / group.length;
      const r = 0.0018; // about 200 m
      spots.push({ item, lngLat: [lng + (r * Math.cos(angle)) / Math.cos((lat * Math.PI) / 180), lat + r * Math.sin(angle)] });
    });
  }
  return spots;
}

/** The box around the pins, opened up a little so one pin never zooms the map to the street. */
function boundsOf(points: LngLat[]): Bounds | null {
  if (!points.length) return null;
  let [w, s] = points[0];
  let [e, n] = points[0];
  for (const [lng, lat] of points) {
    w = Math.min(w, lng);
    e = Math.max(e, lng);
    s = Math.min(s, lat);
    n = Math.max(n, lat);
  }
  const pad = 0.04;
  return [
    [w - pad, s - pad],
    [e + pad, n + pad],
  ];
}

/** The closest a fit goes: a neighbourhood, never the street, since pins are approximate. */
const FIT_ZOOM = 11;
/** One stay alone is framed with its stretch of coast or city around it, not street by street. */
const SINGLE_ZOOM = 10;
const fitZoomFor = (count: number, closest: number) => (count === 1 ? Math.min(closest, SINGLE_ZOOM) : closest);

/**
 * Room around the pins when the map frames them: a price pill is wider than it is tall, so the sides
 * keep half a pill clear, the top clears the note and the zoom buttons, the bottom the map credits.
 */
const paddingFor = (el: HTMLElement): Padding => {
  const side = Math.round(Math.min(72, Math.max(56, el.clientWidth * 0.12)));
  return { top: 76, bottom: 52, left: side, right: side };
};

/** A pin or cluster, drawn by React into the element the map moves around. */
function Marker({ live, lngLat, z, children }: { live: Live; lngLat: LngLat; z: number; children: ReactNode }) {
  const [element] = useState(() => {
    const el = document.createElement('div');
    el.className = 'map-marker';
    return el;
  });
  const marker = useRef<EngineMarker | null>(null);
  const [lng, lat] = lngLat;

  useEffect(() => {
    const m = live.engine.createMarker(element).setLngLat([lng, lat]).addTo(live.map);
    marker.current = m;
    return () => {
      m.remove();
      marker.current = null;
    };
    // Created once per map; position updates below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, element]);

  useEffect(() => {
    marker.current?.setLngLat([lng, lat]);
  }, [lng, lat]);

  useEffect(() => {
    element.style.zIndex = String(z);
  }, [element, z]);

  return createPortal(children, element);
}

/**
 * The explorer's map. It loads only when it is about to be seen, frames the stays that match, and
 * shows them as price pins, or as EA clusters where they crowd. Every stay on it is also in the list,
 * and the zoom buttons mean nothing on it needs dragging.
 */
export function StaysMap({ items, fitKey, area, selected, linked, onSelect, onHover, empty, fallback, fitZoom = FIT_ZOOM }: Props) {
  const t = useTranslations('explorer');
  const tStays = useTranslations('stays');
  const locale = useLocale() as Locale;
  const previewId = useId();
  const host = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLDivElement>(null);

  const [near, setNear] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<Status>('waiting');
  const [live, setLive] = useState<Live | null>(null);
  const [camera, setCamera] = useState<{ bbox: [number, number, number, number]; zoom: number } | null>(null);

  const spots = useMemo(() => spread(items), [items]);
  const bySlug = useMemo(() => new Map(items.map((i) => [i.slug, i])), [items]);

  // The latest props, read by map events without re-creating the map.
  const latest = useRef({ spots, fitKey, area, onSelect, fitZoom });
  useEffect(() => {
    latest.current = { spots, fitKey, area, onSelect, fitZoom };
  });

  // 1. Start once the map is about to be seen (on phones it may be the list's turn, so it waits).
  useEffect(() => {
    const el = host.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting && e.boundingClientRect.width > 0)) setNear(true);
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  const strings = useMemo(
    () => ({
      title: t('map'),
      ctrlHelp: t('ctrlHelp'),
      macHelp: t('macHelp'),
      touchHelp: t('touchHelp'),
      attribution: t('attribution'),
    }),
    [t],
  );

  // 2. Load the library and draw the map, framing the stays that match.
  const framedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!near) return;
    const el = host.current;
    if (!el) return;
    if (!webglAvailable()) {
      setStatus('unsupported');
      return;
    }
    let cancelled = false;
    let map: EngineMap | null = null;
    setStatus('loading');
    const fail = () => {
      if (cancelled) return;
      window.clearTimeout(timer);
      setStatus('error');
    };
    const timer = window.setTimeout(fail, 20000);

    loadEngine().then((engine) => {
      if (cancelled) return;
      const { spots: now, fitKey: key, fitZoom: closest } = latest.current;
      try {
        map = engine.createMap(el, {
          locale,
          strings,
          bounds: boundsOf(now.map((s) => s.lngLat)) ?? EGYPT,
          padding: paddingFor(el),
          fitMaxZoom: fitZoomFor(now.length, closest),
        });
      } catch {
        fail();
        return;
      }
      framedFor.current = key;
      const created = map;
      let loaded = false;
      // A tile that fails later is the map's own business; a style that never arrives is ours to explain.
      created.on('error', (e) => {
        if (!loaded && !('sourceId' in e) && !('tile' in e)) fail();
      });
      created.once('load', () => {
        if (cancelled) return;
        loaded = true;
        window.clearTimeout(timer);
        setLive({ engine, map: created });
        setStatus('ready');
      });
    }, fail);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      map?.remove();
      setLive(null);
      setCamera(null);
    };
  }, [near, attempt, locale, strings]);

  // 3. Follow the camera, so clusters split and merge as the map moves.
  useEffect(() => {
    if (!live) return;
    const { map } = live;
    const update = () => {
      const b = map.getBounds();
      const [w, s, e, n] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
      const dx = (e - w) * 0.3;
      const dy = (n - s) * 0.3;
      setCamera({
        bbox: [Math.max(-180, w - dx), Math.max(-85, s - dy), Math.min(180, e + dx), Math.min(85, n + dy)],
        zoom: map.getZoom(),
      });
    };
    update();
    map.on('moveend', update);
    const onClick = (e: { originalEvent?: Event }) => {
      const target = e.originalEvent?.target;
      if (target instanceof Element && target.closest('.map-marker')) return;
      latest.current.onSelect(null);
    };
    map.on('click', onClick);
    return () => {
      map.off('moveend', update);
      map.off('click', onClick);
    };
  }, [live]);

  // 4. Frame the stays again whenever the search or a filter changes what matches.
  const fitAll = useCallback(() => {
    const el = host.current;
    if (!live || !el) return;
    const { spots: now, area: place, fitZoom: closest } = latest.current;
    const bounds = boundsOf(now.map((s) => s.lngLat));
    if (bounds) live.map.fitBounds(bounds, { padding: paddingFor(el), maxZoom: fitZoomFor(now.length, closest), duration: duration(700) });
    // Nothing matches in the area searched for: show the area, and the card on the map explains.
    else if (place) live.map.easeTo({ center: place.center, zoom: place.zoom, duration: duration(700) });
  }, [live]);

  useEffect(() => {
    if (!live || framedFor.current === fitKey) return;
    framedFor.current = fitKey;
    fitAll();
  }, [live, fitKey, spots, fitAll]);

  const index = useMemo(
    () =>
      new Supercluster<Leaf>({ radius: 64, maxZoom: 14 }).load(
        spots.map(({ item, lngLat }) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: lngLat },
          properties: { slug: item.slug },
        })),
      ),
    [spots],
  );

  const features = useMemo(() => (camera ? index.getClusters(camera.bbox, camera.zoom) : []), [index, camera]);

  // The cluster holding the stay that is hovered in the list or selected, raised with it.
  const raisedCluster = useMemo(() => {
    const target = linked ?? selected;
    if (!target) return null;
    for (const f of features) {
      const p = f.properties as { cluster?: boolean; cluster_id?: number };
      if (p.cluster && index.getLeaves(p.cluster_id!, Infinity).some((leaf) => leaf.properties.slug === target)) {
        return p.cluster_id!;
      }
    }
    return null;
  }, [features, index, linked, selected]);

  // After a cluster opens from the keyboard, focus moves to the marker nearest where it was.
  const focusNear = useRef<LngLat | null>(null);
  useEffect(() => {
    const at = focusNear.current;
    const el = host.current;
    if (!at || !el || !features.length) return;
    focusNear.current = null;
    let best: { key: string; d: number } | null = null;
    for (const f of features) {
      const [lng, lat] = f.geometry.coordinates;
      const p = f.properties as { cluster?: boolean; cluster_id?: number; slug?: string };
      const key = p.cluster ? `c:${p.cluster_id}` : `u:${p.slug}`;
      const d = (lng - at[0]) ** 2 + (lat - at[1]) ** 2;
      if (!best || d < best.d) best = { key, d };
    }
    const target = best ? el.querySelector<HTMLElement>(`[data-key="${CSS.escape(best.key)}"]`) : null;
    // A frame later, once every new marker has settled into the map (a marker that is re-attached drops focus).
    if (target) requestAnimationFrame(() => target.isConnected && target.focus());
  }, [features]);

  // A chosen pin stays in view above its card.
  const focusPreview = useRef(false);
  useEffect(() => {
    const el = host.current;
    if (!live || !selected || !el) return;
    if (focusPreview.current) {
      focusPreview.current = false;
      preview.current?.querySelector<HTMLElement>('a')?.focus();
    }
    const spot = latest.current.spots.find((s) => s.item.slug === selected);
    if (!spot) return;
    const { x, y } = live.map.project(spot.lngLat);
    const w = el.clientWidth;
    const bottom = el.clientHeight - (preview.current ? preview.current.offsetHeight + 24 : 0) - 28;
    const dx = x < 56 ? x - 56 : x > w - 56 ? x - (w - 56) : 0;
    const dy = y < 64 ? y - 64 : y > bottom ? y - bottom : 0;
    if (dx || dy) live.map.panBy([dx, dy], { duration: duration(400) });
  }, [live, selected]);

  const openCluster = (id: number, lngLat: LngLat, fromKeyboard: boolean) => {
    if (!live) return;
    if (fromKeyboard) focusNear.current = lngLat;
    // The card of an earlier pick would cover the pins the cluster splits into.
    if (selected) onSelect(null);
    const zoom = Math.min(index.getClusterExpansionZoom(id), MAX_ZOOM);
    live.map.easeTo({ center: lngLat, zoom, duration: duration(600) });
  };

  const choose = (slug: string, fromKeyboard: boolean) => {
    const next = selected === slug ? null : slug;
    focusPreview.current = fromKeyboard && next !== null;
    onSelect(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape' || !selected) return;
    e.stopPropagation();
    const pin = host.current?.querySelector<HTMLElement>(`[data-slug="${CSS.escape(selected)}"]`);
    onSelect(null);
    pin?.focus();
  };

  const zoom = camera?.zoom ?? 0;
  const atMin = live ? zoom <= live.map.getMinZoom() + 0.01 : true;
  const atMax = live ? zoom >= live.map.getMaxZoom() - 0.01 : true;
  const chosen = selected ? bySlug.get(selected) ?? null : null;

  return (
    <div className="map-frame" data-status={status} onKeyDown={onKeyDown}>
      <div ref={host} className="map-canvas" />

      {status !== 'ready' ? (
        <div className="map-state" role={status === 'error' || status === 'unsupported' ? 'status' : undefined}>
          <EaMark className="map-state__mark" />
          {status === 'error' || status === 'unsupported' ? (
            <>
              <p className="map-state__text">{t(status === 'error' ? 'error' : 'unsupported')}</p>
              <div className="map-state__actions">
                {status === 'error' ? (
                  <button type="button" className="btn btn--secondary btn--small" onClick={() => setAttempt((n) => n + 1)}>
                    {t('retry')}
                  </button>
                ) : null}
                {fallback}
              </div>
            </>
          ) : (
            <span className="sr-only">{t('loading')}</span>
          )}
        </div>
      ) : null}

      {live ? (
        <>
          <p className="map-hint">{t('mapHint')}</p>

          <div className="map-controls">
            <div className="map-ctrl-group">
              <button
                type="button"
                className="map-ctrl"
                aria-label={t('zoomIn')}
                title={t('zoomIn')}
                disabled={atMax}
                onClick={() => live.map.zoomIn({ duration: duration(300) })}
              >
                <PlusIcon />
              </button>
              <button
                type="button"
                className="map-ctrl"
                aria-label={t('zoomOut')}
                title={t('zoomOut')}
                disabled={atMin}
                onClick={() => live.map.zoomOut({ duration: duration(300) })}
              >
                <MinusIcon />
              </button>
            </div>
            <div className="map-ctrl-group">
              <button
                type="button"
                className="map-ctrl"
                aria-label={t('showAll')}
                title={t('showAll')}
                disabled={!spots.length}
                onClick={fitAll}
              >
                <FitIcon />
              </button>
            </div>
          </div>

          {features.map((f) => {
            const [lng, lat] = f.geometry.coordinates as LngLat;
            const p = f.properties as { cluster?: boolean; cluster_id?: number; point_count?: number; slug?: string };
            if (p.cluster) {
              const id = p.cluster_id!;
              const n = p.point_count!;
              const raised = raisedCluster === id;
              return (
                <Marker key={`c${id}`} live={live} lngLat={[lng, lat]} z={raised ? 3 : 1}>
                  <button
                    type="button"
                    className="map-cluster"
                    data-key={`c:${id}`}
                    data-raised={raised || undefined}
                    data-size={n >= 50 ? 'l' : n >= 10 ? 'm' : undefined}
                    aria-label={t('cluster', { count: n, countText: formatNumber(locale, n) })}
                    onClick={(e) => openCluster(id, [lng, lat], e.detail === 0)}
                  >
                    <EaMark className="map-cluster__mark" />
                    <span className="map-cluster__count tabular">{formatNumber(locale, n)}</span>
                  </button>
                </Marker>
              );
            }
            const item = bySlug.get(p.slug!);
            if (!item) return null;
            const isChosen = item.slug === selected;
            const raised = isChosen || item.slug === linked;
            return (
              <Marker key={`u${item.slug}`} live={live} lngLat={[lng, lat]} z={isChosen ? 5 : raised ? 4 : 2}>
                <button
                  type="button"
                  className="map-pin tabular"
                  data-key={`u:${item.slug}`}
                  data-slug={item.slug}
                  data-raised={raised || undefined}
                  aria-pressed={isChosen}
                  aria-controls={isChosen ? previewId : undefined}
                  aria-label={`${item.pin}${locale === 'ar' ? '، ' : ', '}${item.name}`}
                  onClick={(e) => choose(item.slug, e.detail === 0)}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(item.slug)}
                  onPointerLeave={(e) => e.pointerType === 'mouse' && onHover(null)}
                  onFocus={() => onHover(item.slug)}
                  onBlur={() => onHover(null)}
                >
                  {item.pin}
                </button>
              </Marker>
            );
          })}

          {items.length === 0 && empty ? <div className="map-empty">{empty}</div> : null}

          {chosen ? (
            <div ref={preview} id={previewId} className="map-preview" key={chosen.slug}>
              <span className="map-preview__photo soft-arch">
                {chosen.photo ? (
                  <SlotImage
                    slot={chosen.photo.slot}
                    alt={chosen.photo.alt}
                    width={chosen.photo.width}
                    height={chosen.photo.height}
                    sizes="144px"
                    color={chosen.photo.color}
                  />
                ) : null}
              </span>
              <div className="map-preview__text">
                <p className="map-preview__name">
                  <CarryLink href={chosen.href} className="map-preview__link">
                    {chosen.name}
                  </CarryLink>
                </p>
                <p className="map-preview__area">{chosen.area}</p>
                <p className="map-preview__facts tabular">{chosen.facts}</p>
                <p className="map-preview__price tabular">{chosen.price}</p>
                {chosen.sample ? <p className="map-preview__sample">{tStays('sample')}</p> : null}
              </div>
              <button
                type="button"
                className="map-preview__close"
                aria-label={t('closePreview')}
                title={t('closePreview')}
                onClick={() => {
                  const pin = host.current?.querySelector<HTMLElement>(`[data-slug="${CSS.escape(chosen.slug)}"]`);
                  onSelect(null);
                  pin?.focus();
                }}
              >
                <CloseIcon />
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
