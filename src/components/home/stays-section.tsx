import compoundsRaw from '@data/compounds.json';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { amenities as amenityLabels } from '@/lib/amenities';
import { destinations } from '@/lib/destinations';
import { filterAmenities, priceSteps, type FilterOptions } from '@/lib/explorer';
import { unitTypeLabels, unitTypes } from '@/lib/unit-types';
import { units } from '@/lib/units';
import { explorerItems } from '../explorer/explorer-items';
import { StaysExplorer } from '../explorer/stays-explorer';
import { SectionTitle } from '../section-title';
import { UnitCard } from '../unit-card';

const compounds = compoundsRaw.compounds as Record<string, { ar: string }>;

/**
 * Where the search lands: the stays explorer. Every card is rendered here on the server, so all of
 * them are in the page; the explorer shows the ones that fit the search and the filters, beside the map.
 */
export async function StaysSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'staysSection' });
  const items = await explorerItems(units, locale);

  // Filters offer only what the stays have, so no choice leads nowhere.
  const options: FilterOptions = {
    types: unitTypes.filter((type) => units.some((u) => u.type === type)).map((value) => ({ value, label: unitTypeLabels[value][locale] })),
    bedrooms: [1, 2, 3, 4].filter((n) => units.some((u) => u.bedrooms >= n)),
    amenities: filterAmenities
      .filter((a) => units.some((u) => u.amenities.includes(a)))
      .map((value) => ({ value, label: amenityLabels[value][locale] })),
    prices: priceSteps(units.flatMap((u) => (u.fromPriceUsd ? [u.fromPriceUsd] : []))),
  };

  const areas = destinations.map((d) => ({
    value: d.slug,
    label: d.name[locale],
    center: [d.center.lng, d.center.lat] as [number, number],
    zoom: d.zoom,
  }));
  const compoundLabels = Object.fromEntries(
    Object.entries(compounds).map(([en, names]) => [en, locale === 'ar' ? names.ar : en]),
  );

  return (
    <section id="stays" className="section bg-cream" aria-labelledby="stays-title">
      <div className="wrap">
        <SectionTitle id="stays-title" light={t('titleLight')} bold={t('titleBold')} />
        <StaysExplorer items={items} areas={areas} compounds={compoundLabels} options={options}>
          {units.map((unit) => (
            <UnitCard
              key={unit.slug}
              unit={unit}
              locale={locale}
              sizes="(max-width: 40rem) 100vw, (max-width: 64rem) 50vw, (max-width: 80rem) 27vw, 340px"
            />
          ))}
        </StaysExplorer>
      </div>
    </section>
  );
}
