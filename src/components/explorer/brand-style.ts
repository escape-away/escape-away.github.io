import type { Locale } from '@/i18n/routing';

type StyleLayer = { id: string; type: string };
type StyleableMap = {
  getStyle(): { layers?: StyleLayer[] } | undefined;
  getLayoutProperty(id: string, name: string): unknown;
  setPaintProperty(id: string, name: string, value: unknown): unknown;
  setLayoutProperty(id: string, name: string, value: unknown): unknown;
};

/** Map colours come from design/tokens.css (the --map-* tokens), so the basemap follows the palette. */
function palette() {
  const css = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    land: read('--map-land', '#efe6d6'),
    landuse: read('--map-landuse', '#ebe1cf'),
    green: read('--map-green', '#e2dfc8'),
    water: read('--map-water', '#c7d5e6'),
    waterLine: read('--map-water-line', '#b3c5dc'),
    road: read('--map-road', '#fbf7f0'),
    roadCasing: read('--map-road-casing', '#dccdb8'),
    building: read('--map-building', '#e6dbc9'),
    boundary: read('--map-boundary', '#b3a089'),
    label: read('--map-label', '#5e4d3e'),
    waterLabel: read('--map-water-label', '#4a6286'),
    halo: read('--map-label-halo', '#f6f0e6'),
  };
}

/**
 * Place names in the page's language. Arabic falls back to the local name; English falls back to a
 * Latin spelling and otherwise shows no label, so the English map never mixes in Arabic names (the
 * map's data has no English name for some villages).
 */
function nameField(locale: Locale) {
  return locale === 'ar'
    ? ['coalesce', ['get', 'name:ar'], ['get', 'name_ar'], ['get', 'name']]
    : ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name:latin'], ['get', 'name_int'], ''];
}

/** Hidden labels: everything but places and water, and country names (cut at the edge of the Egypt view). */
const hide = /state|country|poi|shield|transit|rail|ferry|aerialway|aerodrome|airport|aeroway|housenum|highway-name|road-label|road_label|road-number|path|ref|golf|ski|landmark|building-number/;

/**
 * Turns the basemap into Escape Away's: warm land, pale ice water, quiet white roads, place names
 * in espresso, and nothing else competing with the price pins (no shops, stations or road names).
 */
export function brandStyle(map: StyleableMap, locale: Locale) {
  const layers = map.getStyle()?.layers ?? [];
  const c = palette();
  const text = nameField(locale);

  for (const { id, type } of layers) {
    try {
      if (type === 'background') {
        map.setPaintProperty(id, 'background-color', c.land);
      } else if (type === 'fill') {
        if (/water|ocean|sea|lake/.test(id)) map.setPaintProperty(id, 'fill-color', c.water);
        else if (/building/.test(id)) {
          map.setPaintProperty(id, 'fill-color', c.building);
          map.setPaintProperty(id, 'fill-outline-color', c.building);
        } else if (/park|wood|grass|forest|national|landcover|scrub|wetland|glacier|ice/.test(id)) {
          map.setPaintProperty(id, 'fill-color', c.green);
        } else map.setPaintProperty(id, 'fill-color', c.landuse);
      } else if (type === 'line') {
        if (/waterway|river|stream|canal/.test(id)) map.setPaintProperty(id, 'line-color', c.waterLine);
        else if (/rail|ferry|transit|aerialway|cable/.test(id)) map.setLayoutProperty(id, 'visibility', 'none');
        else if (/boundary|admin/.test(id)) map.setPaintProperty(id, 'line-color', c.boundary);
        else if (/casing|case|outline/.test(id)) map.setPaintProperty(id, 'line-color', c.roadCasing);
        else map.setPaintProperty(id, 'line-color', c.road);
      } else if (type === 'symbol') {
        if (hide.test(id)) {
          map.setLayoutProperty(id, 'visibility', 'none');
          continue;
        }
        const water = /water|ocean|sea|marine|lake/.test(id);
        map.setPaintProperty(id, 'text-color', water ? c.waterLabel : c.label);
        map.setPaintProperty(id, 'text-halo-color', c.halo);
        map.setPaintProperty(id, 'text-halo-width', 1.4);
        map.setPaintProperty(id, 'icon-opacity', 0);
        if (map.getLayoutProperty(id, 'text-field') !== undefined) map.setLayoutProperty(id, 'text-field', text);
      } else if (type === 'fill-extrusion' || type === 'hillshade' || type === 'raster') {
        map.setLayoutProperty(id, 'visibility', 'none');
      }
    } catch {
      // A layer that doesn't take a property keeps its own look; the rest of the map still turns.
    }
  }
}
