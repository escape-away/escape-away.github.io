'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import { EaMark } from '../ea-mark';
import { MinusIcon, PlusIcon } from '../explorer/icons';
import { loadEngine, webglAvailable, type Bounds, type EngineMap, type LngLat } from '../explorer/map-engine';

type Status = 'waiting' | 'loading' | 'ready' | 'error' | 'unsupported';

/** How far the circle reaches around the approximate pin: the area, never the building. */
const RADIUS_KM = 0.9;

function circle([lng, lat]: LngLat, km: number) {
  const dLat = km / 110.574;
  const dLng = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  const ring: LngLat[] = [];
  for (let i = 0; i <= 64; i += 1) {
    const a = (i / 64) * 2 * Math.PI;
    ring.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  // Framed with room around the circle, so the coast and the nearest place names show for context.
  const room = 2.4;
  const bounds: Bounds = [
    [lng - dLng * room, lat - dLat * room],
    [lng + dLng * room, lat + dLat * room],
  ];
  return { feature: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }, bounds };
}

const duration = (ms: number) => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms);

/**
 * Where a home is, shown honestly: a soft navy circle around the approximate pin, on the same
 * brand map as the explorer. It loads only when it is about to be seen; the zoom buttons mean
 * nothing on it needs dragging.
 */
export function AreaMap({ center }: { center: LngLat }) {
  const t = useTranslations('explorer');
  const tl = useTranslations('listing');
  const locale = useLocale() as Locale;
  const host = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<Status>('waiting');
  const [map, setMap] = useState<EngineMap | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [lng, lat] = center;
  const area = useMemo(() => circle([lng, lat], RADIUS_KM), [lng, lat]);

  useEffect(() => {
    const el = host.current;
    if (!el || near) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), {
      rootMargin: '400px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  const strings = useMemo(
    () => ({
      title: tl('mapTitle'),
      ctrlHelp: t('ctrlHelp'),
      macHelp: t('macHelp'),
      touchHelp: t('touchHelp'),
      attribution: t('attribution'),
    }),
    [t, tl],
  );

  useEffect(() => {
    if (!near) return;
    const el = host.current;
    if (!el) return;
    if (!webglAvailable()) {
      setStatus('unsupported');
      return;
    }
    let cancelled = false;
    let created: EngineMap | null = null;
    setStatus('loading');
    const fail = () => {
      if (cancelled) return;
      window.clearTimeout(timer);
      setStatus('error');
    };
    const timer = window.setTimeout(fail, 20000);

    loadEngine().then((engine) => {
      if (cancelled) return;
      try {
        created = engine.createMap(el, {
          locale,
          strings,
          bounds: area.bounds,
          padding: { top: 48, bottom: 48, left: 48, right: 48 },
          fitMaxZoom: 14,
        });
      } catch {
        fail();
        return;
      }
      const m = created;
      let loaded = false;
      m.on('error', (e) => {
        if (!loaded && !('sourceId' in e) && !('tile' in e)) fail();
      });
      m.once('load', () => {
        if (cancelled) return;
        loaded = true;
        window.clearTimeout(timer);
        const navy = getComputedStyle(document.documentElement).getPropertyValue('--ea-navy').trim() || '#003c82';
        m.addSource('area', { type: 'geojson', data: area.feature });
        m.addLayer({ id: 'area-fill', type: 'fill', source: 'area', paint: { 'fill-color': navy, 'fill-opacity': 0.12 } });
        m.addLayer({ id: 'area-line', type: 'line', source: 'area', paint: { 'line-color': navy, 'line-opacity': 0.55, 'line-width': 2 } });
        setMap(m);
        setZoom(m.getZoom());
        setStatus('ready');
      });
      m.on('zoomend', () => setZoom(m.getZoom()));
    }, fail);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      created?.remove();
      setMap(null);
    };
  }, [near, attempt, locale, strings, area]);

  const atMin = map && zoom != null ? zoom <= map.getMinZoom() + 0.01 : true;
  const atMax = map && zoom != null ? zoom >= map.getMaxZoom() - 0.01 : true;

  return (
    <div className="map-frame area-map" data-status={status}>
      <div ref={host} className="map-canvas" />
      {status !== 'ready' ? (
        <div className="map-state" role={status === 'error' || status === 'unsupported' ? 'status' : undefined}>
          <EaMark className="map-state__mark" />
          {status === 'error' || status === 'unsupported' ? (
            <>
              <p className="map-state__text">{tl(status === 'error' ? 'mapError' : 'mapUnsupported')}</p>
              {status === 'error' ? (
                <button type="button" className="btn btn--secondary btn--small" onClick={() => setAttempt((n) => n + 1)}>
                  {t('retry')}
                </button>
              ) : null}
            </>
          ) : (
            <span className="sr-only">{t('loading')}</span>
          )}
        </div>
      ) : null}
      {map ? (
        <div className="map-controls">
          <div className="map-ctrl-group">
            <button
              type="button"
              className="map-ctrl"
              aria-label={t('zoomIn')}
              title={t('zoomIn')}
              disabled={atMax}
              onClick={() => map.zoomIn({ duration: duration(300) })}
            >
              <PlusIcon />
            </button>
            <button
              type="button"
              className="map-ctrl"
              aria-label={t('zoomOut')}
              title={t('zoomOut')}
              disabled={atMin}
              onClick={() => map.zoomOut({ duration: duration(300) })}
            >
              <MinusIcon />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
