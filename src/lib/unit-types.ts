import type { Locale } from '@/i18n/routing';

/** Every kind of home a unit can be, with its label in both languages. Keys match the units table. */
export const unitTypeLabels = {
  studio: { en: 'Studio', ar: 'استوديو' },
  apartment: { en: 'Apartment', ar: 'شقة' },
  chalet: { en: 'Chalet', ar: 'شاليه' },
  villa: { en: 'Villa', ar: 'فيلا' },
  duplex: { en: 'Duplex', ar: 'دوبلكس' },
  penthouse: { en: 'Penthouse', ar: 'بنتهاوس' },
  townhouse: { en: 'Townhouse', ar: 'تاون هاوس' },
} as const satisfies Record<string, Record<Locale, string>>;

export type UnitType = keyof typeof unitTypeLabels;

export const unitTypes = Object.keys(unitTypeLabels) as UnitType[];

export const isUnitType = (key: string): key is UnitType => key in unitTypeLabels;
