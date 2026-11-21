import { AttributionControl, Map as MapLibreMap, Marker, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { brandStyle } from './brand-style';
import { MAX_ZOOM, MIN_ZOOM, type Engine, type EngineMap, type EngineMarker } from './map-engine';

// Next.js emits the worker as a hashed file next to the bundle.
setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString());

/** OpenFreeMap's light style: free, no account, no key. Its attribution travels with the tiles. */
const STYLE = 'https://tiles.openfreemap.org/styles/positron';

export function maplibreEngine(): Engine {
  return {
    kind: 'maplibre',
    createMap(container, { locale, strings, bounds, padding, fitMaxZoom = 11 }) {
      const map = new MapLibreMap({
        container,
        style: STYLE,
        bounds,
        fitBoundsOptions: { padding, maxZoom: fitMaxZoom },
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        renderWorldCopies: false,
        // In a page that scrolls: two fingers move the map on phones, Ctrl or ⌘ and the wheel zooms it.
        cooperativeGestures: true,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        attributionControl: false,
        locale: {
          'Map.Title': strings.title,
          'AttributionControl.ToggleAttribution': strings.attribution,
          'CooperativeGesturesHandler.WindowsHelpText': strings.ctrlHelp,
          'CooperativeGesturesHandler.MacHelpText': strings.macHelp,
          'CooperativeGesturesHandler.MobileHelpText': strings.touchHelp,
        },
      });
      map.keyboard.disableRotation();
      map.touchZoomRotate.disableRotation();
      map.addControl(new AttributionControl({ compact: true }), locale === 'ar' ? 'bottom-left' : 'bottom-right');
      map.on('style.load', () => brandStyle(map, locale));
      return map as unknown as EngineMap;
    },
    createMarker(element) {
      return new Marker({ element, anchor: 'center' }) as unknown as EngineMarker;
    },
  };
}
