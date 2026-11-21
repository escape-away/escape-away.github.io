import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { whereOptions } from '@/lib/search-options';
import { ogImage, pageMetadata } from '@/lib/seo';
import { homeStructuredData, jsonLd } from '@/lib/structured-data';
import { Collections } from '@/components/home/collections';
import { DestinationsScroll } from '@/components/home/destinations-scroll';
import { Faq } from '@/components/home/faq';
import { Hero } from '@/components/home/hero';
import { OwnerAct } from '@/components/home/owner-act';
import { StaysSection } from '@/components/home/stays-section';
import { Trust } from '@/components/home/trust';
import { CompactSearch } from '@/components/search/compact-search';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return pageMetadata({
    locale,
    path: '/',
    title: t('homeTitle'),
    description: t('description'),
    absolute: true,
    image: ogImage('hero-01', locale),
  });
}

/**
 * One scroll in three acts. Act 1: arrive and search. Act 2: the places, the stays and the proof.
 * Act 3: the turn to navy for owners, then answers. Book-direct perks wait for Escape Away to decide them.
 */
export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'meta' });

  return (
    <>
      <Hero locale={locale} />
      {/* Past the hero, the header carries the search (a pill that opens it in a panel). */}
      <CompactSearch locale={locale} options={whereOptions()} />
      <Collections locale={locale} />
      <DestinationsScroll locale={locale} />
      <StaysSection locale={locale} />
      <Trust locale={locale} />
      <OwnerAct locale={locale} />
      <Faq locale={locale} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(homeStructuredData(locale, t('about'))) }} />
    </>
  );
}
