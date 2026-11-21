import type { Locale } from '@/i18n/routing';

/**
 * The map behind the explorer, behind one small interface.
 * - With NEXT_PUBLIC_MAPBOX_TOKEN set (the brief's choice): Mapbox GL JS on Mapbox's light style.
 * - Without it: MapLibre GL JS, Mapbox GL's open-source twin, on OpenFreeMap's free tiles, so the
 *   demo has a working map before any account exists.
 * Either way the library loads only when the map is about to be seen, and the explorer's own
 * markers, controls and card sit on top, so both look and behave the same.
 */
export type LngLat = [number, number];
export type Bounds = [LngLat, LngLat];
export type Padding = { top: number; bottom: number; left: number; right: number };

type Handler = (event: { originalEvent?: Event }) => void;

export interface EngineMap {
  on(type: string, handler: Handler): unknown;
  off(type: string, handler: Handler): unknown;
  once(type: string, handler: Handler): unknown;
  getBounds(): { getWest(): number; getSouth(): number; getEast(): number; getNorth(): number };
  getZoom(): number;
  getMinZoom(): number;
  getMaxZoom(): number;
  project(lngLat: LngLat): { x: number; y: number };
  fitBounds(bounds: Bounds, options?: object): unknown;
  easeTo(options: object): unknown;
  panBy(offset: [number, number], options?: object): unknown;
  zoomIn(options?: object): unknown;
  zoomOut(options?: object): unknown;
  addSource(id: string, source: object): unknown;
  addLayer(layer: object): unknown;
  remove(): void;
}

export interface EngineMarker {
  setLngLat(lngLat: LngLat): EngineMarker;
  addTo(map: EngineMap): EngineMarker;
  remove(): void;
}

export type MapStrings = {
  title: string;
  ctrlHelp: string;
  macHelp: string;
  touchHelp: string;
  attribution: string;
};

export type CreateOptions = {
  locale: Locale;
  strings: MapStrings;
  bounds: Bounds;
  padding: Padding;
  /** The closest the first view may zoom; the explorer keeps to a neighbourhood (11). */
  fitMaxZoom?: number;
};

export interface Engine {
  kind: 'mapbox' | 'maplibre';
  createMap(container: HTMLElement, options: CreateOptions): EngineMap;
  createMarker(element: HTMLElement): EngineMarker;
}

export const MIN_ZOOM = 4;
export const MAX_ZOOM = 16;

const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

let pending: Promise<Engine> | null = null;

/** Loads the map library once; a failed load can be tried again. */
export function loadEngine(): Promise<Engine> {
  pending ??= (
    token
      ? import('./engine-mapbox').then((m) => m.mapboxEngine(token))
      : import('./engine-maplibre').then((m) => m.maplibreEngine())
  ).catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
}

/** WebGL is the one thing the map can't do without; checked before the library is fetched. */
export function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
