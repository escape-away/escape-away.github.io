'use client';

import { Fragment, type ReactNode } from 'react';
import { useSearch } from '@/lib/search-state';

type Card = { slug: string; guests: number; card: ReactNode };

/**
 * "More stays" under a listing, fitted to the party in the search: a home too small for the group
 * isn't offered. Without a party (and in the page as built) it shows the first ones in order; when
 * no other home sleeps the group, the section steps aside.
 */
export function MoreStays({ title, cards, count = 3 }: { title: ReactNode; cards: Card[]; count?: number }) {
  const { adults, children } = useSearch();
  const party = adults + children;
  const shown = cards.filter((c) => c.guests >= party).slice(0, count);
  if (!shown.length) return null;

  return (
    <section className="section listing-more bg-sand" aria-labelledby="more-title">
      <div className="wrap">
        {title}
        <div className="listing-more__grid">
          {shown.map((c) => (
            <Fragment key={c.slug}>{c.card}</Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
