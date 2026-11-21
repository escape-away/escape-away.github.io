import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { brandStyle } from './brand-style';
import { MAX_ZOOM, MIN_ZOOM, type Engine, type EngineMap, type EngineMarker } from './map-engine';

/**
 * Mapbox GL JS, used once NEXT_PUBLIC_MAPBOX_TOKEN is set (a public "pk." token limited to the
 * site's address). Mapbox's light style is recoloured with the same brand palette, and Mapbox loads
 * its own right-to-left text support for the Arabic place names.
 */
const STYLE = 'mapbox://styles/mapbox/light-v11';

export function mapboxEngine(token: string): Engine {
  return {
    kind: 'mapbox',
    createMap(container, { locale, strings, bounds, padding, fitMaxZoom = 11 }) {
      const map = new mapboxgl.Map({
        container,
        accessToken: token,
        style: STYLE,
        projection: 'mercator',
        bounds,
        fitBoundsOptions: { padding, maxZoom: fitMaxZoom },
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        renderWorldCopies: false,
        cooperativeGestures: true,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        language: locale,
        logoPosition: locale === 'ar' ? 'bottom-right' : 'bottom-left',
        locale: {
          'Map.Title': strings.title,
          'AttributionControl.ToggleAttribution': strings.attribution,
          'ScrollZoomBlocker.CtrlMessage': strings.ctrlHelp,
          'ScrollZoomBlocker.CmdMessage': strings.macHelp,
          'TouchPanBlocker.Message': strings.touchHelp,
        },
      });
      map.keyboard.disableRotation();
      map.touchZoomRotate.disableRotation();
      map.on('style.load', () => brandStyle(map as never, locale));
      return map as unknown as EngineMap;
    },
    createMarker(element) {
      return new mapboxgl.Marker({ element, anchor: 'center' }) as unknown as EngineMarker;
    },
  };
}
