import type { Locale } from '@/i18n/routing';

/** Every amenity a unit can list, with its label in both languages. Keys match the units table. */
export const amenities = {
  'sea-view': { en: 'Sea view', ar: 'إطلالة على البحر' },
  'private-pool': { en: 'Private pool', ar: 'حمام سباحة خاص' },
  'shared-pool': { en: 'Shared pool', ar: 'حمام سباحة مشترك' },
  'beach-access': { en: 'Beach access', ar: 'وصول إلى الشاطئ' },
  garden: { en: 'Garden', ar: 'حديقة' },
  parking: { en: 'Parking', ar: 'موقف سيارات' },
  wifi: { en: 'Wi-Fi', ar: 'واي فاي' },
  'air-conditioning': { en: 'Air conditioning', ar: 'تكييف' },
  kitchen: { en: 'Kitchen', ar: 'مطبخ' },
  washer: { en: 'Washer', ar: 'غسالة' },
  workspace: { en: 'Workspace', ar: 'مكان للعمل' },
  lift: { en: 'Lift', ar: 'مصعد' },
} as const satisfies Record<string, Record<Locale, string>>;

export type AmenityKey = keyof typeof amenities;

export const isAmenity = (key: string): key is AmenityKey => key in amenities;
