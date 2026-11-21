import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { getDestination } from '@/lib/destinations';
import { CarryLink } from './carry-link';
import { formatEgp, formatNumber } from '@/lib/format';
import { firstPhoto } from '@/lib/images';
import { compoundName, type Unit } from '@/lib/units';
import { Photo } from './photo';
import { SaveButton } from './save-button';

export async function unitFacts(unit: Unit, locale: Locale) {
  const t = await getTranslations({ locale, namespace: 'stays' });
  return {
    facts: t('facts', {
      guests: unit.guests,
      bedrooms: unit.bedrooms,
      baths: unit.baths,
      guestsText: formatNumber(locale, unit.guests),
      bedroomsText: formatNumber(locale, unit.bedrooms),
      bathsText: formatNumber(locale, unit.baths),
    }),
    price: unit.fromPriceEgp ? t('from', { price: formatEgp(locale, unit.fromPriceEgp) }) : t('priceOnRequest'),
    sample: unit.sample ? t('sample') : null,
  };
}

/** A unit in a list. The whole card is one link; the photo zooms inside its soft arch on hover. */
export async function UnitCard({
  unit,
  locale,
  headingLevel = 'h3',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
}: {
  unit: Unit;
  locale: Locale;
  headingLevel?: 'h2' | 'h3';
  /** The width the photo takes at each breakpoint. */
  sizes?: string;
}) {
  const { facts, price, sample } = await unitFacts(unit, locale);
  const destination = getDestination(unit.destination);
  const Heading = headingLevel;

  return (
    <article className="group relative grid content-start gap-2">
      <span className="soft-arch mb-2 block aspect-[4/3]">
        <Photo
          slot={firstPhoto(unit.photos)}
          locale={locale}
          sizes={sizes}
          className="transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)] group-hover:scale-[1.03]"
        />
      </span>
      <Heading className="line-clamp-3 pb-[var(--clamp-room)] font-body text-[length:var(--text-body)] font-medium leading-[var(--leading-clamp)] tracking-normal">
        <CarryLink href={`/stays/${unit.slug}`} className="no-underline after:absolute after:inset-0">
          {unit.name[locale]}
        </CarryLink>
      </Heading>
      <SaveButton slug={unit.slug} name={unit.name[locale]} />
      <p className="text-[length:var(--text-small)] text-fg-muted">
        {compoundName(unit, locale)} · {destination?.name[locale]}
      </p>
      <p className="tabular text-[length:var(--text-small)]">{facts}</p>
      <p className="tabular">{price}</p>
      {sample ? <p className="text-[length:var(--text-label)] text-fg-muted">{sample}</p> : null}
    </article>
  );
}
