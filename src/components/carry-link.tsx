'use client';

import type { ComponentProps } from 'react';
import { Link } from '@/i18n/navigation';
import { useSearch } from '@/lib/search-state';

/** A link to a listing that carries the chosen dates and guests along, so nobody types them twice. */
export function CarryLink({ href, ...rest }: Omit<ComponentProps<typeof Link>, 'href'> & { href: string }) {
  const s = useSearch();
  const p = new URLSearchParams();
  if (s.checkin) p.set('in', s.checkin);
  if (s.checkout) p.set('out', s.checkout);
  if (s.adults) p.set('adults', String(s.adults));
  if (s.children) p.set('children', String(s.children));
  if (s.infants) p.set('infants', String(s.infants));
  const query = p.toString();
  return <Link href={query ? `${href}?${query}` : href} {...rest} />;
}
