import compoundsRaw from '@data/compounds.json';
import type { Locale } from '@/i18n/routing';
import { getDestination } from '@/lib/destinations';
import type { ExplorerItem } from '@/lib/explorer';
import { firstPhoto, imageSlot } from '@/lib/images';
import { normalize } from '@/lib/normalize';
import { formatMoney, usd } from '@/lib/pricing';
import { unitTypeLabels } from '@/lib/unit-types';
import { compoundName, type Unit } from '@/lib/units';
import { unitFacts } from '../unit-card';

const compounds = compoundsRaw.compounds as Record<string, { ar: string }>;

/**
 * What the map and the explorer need about each stay, built on the server in the page's language:
 * the homepage explorer takes every stay, a destination page the stays in its area.
 */
export function explorerItems(list: Unit[], locale: Locale): Promise<ExplorerItem[]> {
  return Promise.all(
    list.map(async (u) => {
      const d = getDestination(u.destination)!;
      const { facts, price } = await unitFacts(u, locale);
      const image = imageSlot(firstPhoto(u.photos));
      const { lat, lng } = u.pinApprox;
      return {
        slug: u.slug,
        href: `/stays/${u.slug}`,
        name: u.name[locale],
        area: `${compoundName(u, locale)} · ${d.name[locale]}`,
        facts,
        price,
        pin: u.fromPriceUsd ? formatMoney(locale, usd(u.fromPriceUsd)) : unitTypeLabels[u.type][locale],
        photo: image
          ? { slot: image.slot, alt: image.alt[locale], width: image.width, height: image.height, color: image.color }
          : null,
        sample: Boolean(u.sample),
        destination: u.destination,
        compound: u.compound,
        type: u.type,
        bedrooms: u.bedrooms,
        guests: u.guests,
        amenities: u.amenities,
        collections: u.collections,
        priceUsd: u.fromPriceUsd,
        lngLat: lat != null && lng != null ? ([lng, lat] as [number, number]) : null,
        keys: normalize(
          [u.name.en, u.name.ar, u.compound, compounds[u.compound]?.ar ?? '', d.name.en, d.name.ar, ...d.aliases, u.code].join(' '),
        ),
      };
    }),
  );
}
