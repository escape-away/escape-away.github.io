'use client';

import type { MouseEvent, ReactNode } from 'react';
import { scrollToSection, setSearch, type SearchState } from '@/lib/search-state';

/**
 * A link that applies a search (a collection, a destination) and drops into the stays below.
 * Without JavaScript the href still loads the same filtered view.
 */
export function SearchLink({
  params,
  className,
  children,
}: {
  params: Partial<SearchState>;
  className?: string;
  children: ReactNode;
}) {
  const query = new URLSearchParams(
    Object.entries(params).flatMap(([k, v]) => (v ? [[k === 'checkin' ? 'in' : k === 'checkout' ? 'out' : k, String(v)]] : [])),
  ).toString();

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setSearch(params, { hash: '' });
    scrollToSection('stays');
  };

  return (
    <a href={`?${query}#stays`} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
