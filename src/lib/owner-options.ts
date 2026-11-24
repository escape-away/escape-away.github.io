import type { Locale } from '@/i18n/routing';
import { allDestinations } from './destinations';
import { normalize } from './normalize';
import { compoundName, units } from './units';

/**
 * What the owner form offers, built on the server so the units file never ships to the browser:
 * every area Escape Away works in (including those the site doesn't show yet), and the compounds where Escape Away already lists a home. Those compounds are
 * suggested while the owner types, and a unit in one of them scores higher for location demand.
 */
export function ownerFormOptions(locale: Locale) {
  const areas = allDestinations.map((d) => ({ slug: d.slug, name: d.name[locale] }));
  const seen = new Set<string>();
  const compounds = units.flatMap((u) => {
    if (seen.has(u.compound)) return [];
    seen.add(u.compound);
    return [
      {
        area: u.destination,
        label: compoundName(u, locale),
        en: compoundName(u, 'en'),
        match: [normalize(compoundName(u, 'en')), normalize(compoundName(u, 'ar'))],
      },
    ];
  });
  return { areas, compounds };
}
