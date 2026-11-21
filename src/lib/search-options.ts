import compoundsRaw from '@data/compounds.json';
import type { Locale } from '@/i18n/routing';
import { destinations } from './destinations';
import { normalize } from './normalize';
import { units } from './units';

/** One suggestion in the hero's Where field: a destination or a compound. */
export type WhereOption = {
  value: string;
  kind: 'destination' | 'compound';
  label: Record<Locale, string>;
  /** For a compound, the destination it sits in. */
  in?: Record<Locale, string>;
  /** Everything the option can be found by, folded for Arabic and Latin variants. */
  keys: string;
};

const compounds = compoundsRaw.compounds as Record<string, { ar: string }>;

let built: WhereOption[] | null = null;

/** The same list each call, so a page that hands it to two searches carries it once. */
export function whereOptions(): WhereOption[] {
  if (built) return built;
  const options: WhereOption[] = destinations.map((d) => ({
    value: d.slug,
    kind: 'destination',
    label: d.name,
    keys: normalize([d.name.en, d.name.ar, ...d.aliases].join(' ')),
  }));

  const seen = new Set<string>();
  for (const u of units) {
    if (seen.has(u.compound)) continue;
    seen.add(u.compound);
    const d = destinations.find((x) => x.slug === u.destination)!;
    options.push({
      value: u.compound,
      kind: 'compound',
      label: { en: u.compound, ar: compounds[u.compound]?.ar ?? u.compound },
      in: d.name,
      keys: normalize([u.compound, compounds[u.compound]?.ar ?? '', d.name.en, d.name.ar].join(' ')),
    });
  }
  built = options;
  return options;
}
