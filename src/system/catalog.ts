/**
 * The demo's fixed records: areas, compounds, owners, staff and 60 sample units. The five homes the
 * website already shows keep their codes, names and photos, so the site and the system agree.
 * Everything here is sample data until Escape Away's real unit list is imported.
 */
import siteData from '@data/units.json';
import type { Area, AreaId, Compound, L10n, Owner, Staff, Unit, UnitType } from './types';

/** Egyptian mobile numbers in the +20 1X XXXX XXXX shape, made up for the sample. */
export const samplePhone = (i: number) =>
  `+20 1${[0, 1, 2, 5][i % 4]} ${String(2000 + i * 317).slice(-4)} ${String(5000 + i * 731).slice(-4)}`;

export const areas: Area[] = [
  { id: 'cairo', prefix: 'CA', name: { en: 'Cairo', ar: 'القاهرة' } },
  { id: 'sheikh-zayed', prefix: 'SZ', name: { en: 'Sheikh Zayed', ar: 'الشيخ زايد' } },
  { id: 'north-coast', prefix: 'NC', name: { en: 'North Coast', ar: 'الساحل الشمالي' } },
  { id: 'el-alamein', prefix: 'AL', name: { en: 'El Alamein', ar: 'العلمين' } },
  { id: 'gouna', prefix: 'GN', name: { en: 'Gouna', ar: 'الجونة' } },
];

export const areaById = Object.fromEntries(areas.map((a) => [a.id, a])) as Record<AreaId, Area>;

export const compounds: Compound[] = [
  { code: 'MVI', area: 'cairo', name: { en: 'Mountain View iCity', ar: 'ماونتن فيو آي سيتي' } },
  { code: 'MVD', area: 'cairo', name: { en: 'Mivida', ar: 'ميفيدا' } },
  { code: 'CFC', area: 'cairo', name: { en: 'Cairo Festival City', ar: 'كايرو فستيفال سيتي' } },
  { code: 'ETN', area: 'cairo', name: { en: 'Eastown', ar: 'إيستاون' } },
  { code: 'ALG', area: 'sheikh-zayed', name: { en: 'Allegria', ar: 'أليجريا' } },
  { code: 'WTN', area: 'sheikh-zayed', name: { en: 'Westown', ar: 'ويستاون' } },
  { code: 'MRS', area: 'north-coast', name: { en: 'Marassi', ar: 'مراسي' } },
  { code: 'HCB', area: 'north-coast', name: { en: 'Hacienda Bay', ar: 'هاسيندا باي' } },
  { code: 'SLK', area: 'north-coast', name: { en: 'Swan Lake', ar: 'سوان ليك' } },
  { code: 'ATW', area: 'el-alamein', name: { en: 'Alamein Towers', ar: 'أبراج العلمين' } },
  { code: 'MZR', area: 'el-alamein', name: { en: 'Mazarine', ar: 'مازارين' } },
  { code: 'ATM', area: 'gouna', name: { en: 'Abu Tig Marina', ar: 'مارينا أبو تيج' } },
  { code: 'WGF', area: 'gouna', name: { en: 'West Golf', ar: 'ويست جولف' } },
];

export const compoundByCode = Object.fromEntries(compounds.map((c) => [c.code, c])) as Record<string, Compound>;

export const owners: Owner[] = (
  [
    ['nadia', 'Nadia El Sherif', 'نادية الشريف', 'Dubai', 'دبي', 'full', 'bank', '2024-03'],
    ['hany', 'Hany Abdelaziz', 'هاني عبد العزيز', 'Cairo', 'القاهرة', 'manage', 'bank', '2023-06'],
    ['karim', 'Karim Mansour', 'كريم منصور', 'Cairo', 'القاهرة', 'full', 'wallet', '2024-09'],
    ['hoda', 'Hoda Ragab', 'هدى رجب', 'Alexandria', 'الإسكندرية', 'manage', 'bank', '2023-11'],
    ['tarek', 'Tarek Soliman', 'طارق سليمان', 'Riyadh', 'الرياض', 'full', 'bank', '2024-01'],
    ['dina', 'Dina Fouad', 'دينا فؤاد', 'Cairo', 'القاهرة', 'manage', 'wallet', '2025-02'],
    ['sherif', 'Sherif Lotfy', 'شريف لطفي', 'London', 'لندن', 'full', 'bank', '2023-05'],
    ['mai', 'Mai Hegazy', 'مي حجازي', 'Cairo', 'القاهرة', 'manage', 'wallet', '2025-04'],
    ['omar', 'Omar Badawy', 'عمر بدوي', 'Kuwait City', 'الكويت', 'full', 'bank', '2024-06'],
    ['salma', 'Salma Naguib', 'سلمى نجيب', 'Cairo', 'القاهرة', 'manage', 'bank', '2025-01'],
    ['waleed', 'Waleed Shawky', 'وليد شوقي', 'Doha', 'الدوحة', 'full', 'bank', '2024-04'],
    ['rasha', 'Rasha Hamdy', 'رشا حمدي', 'Cairo', 'القاهرة', 'manage', 'wallet', '2025-06'],
    ['mostafa', 'Mostafa Elkady', 'مصطفى القاضي', 'Alexandria', 'الإسكندرية', 'full', 'bank', '2024-08'],
    ['laila', 'Laila Wahba', 'ليلى وهبة', 'Cairo', 'القاهرة', 'manage', 'bank', '2023-09'],
    ['ayman', 'Ayman Sorour', 'أيمن سرور', 'Jeddah', 'جدة', 'full', 'bank', '2024-11'],
    ['ingy', 'Ingy Kamel', 'إنجي كامل', 'Cairo', 'القاهرة', 'manage', 'wallet', '2025-03'],
    ['khaled', 'Khaled Atef', 'خالد عاطف', 'Cairo', 'القاهرة', 'full', 'bank', '2024-02'],
    ['noha', 'Noha Barakat', 'نهى بركات', 'Dubai', 'دبي', 'manage', 'bank', '2025-05'],
    ['sameh', 'Sameh Ghali', 'سامح غالي', 'Cairo', 'القاهرة', 'full', 'bank', '2023-12'],
    ['yara', 'Yara Moussa', 'يارا موسى', 'Cairo', 'القاهرة', 'manage', 'wallet', '2025-07'],
    ['adel', 'Adel Fawzy', 'عادل فوزي', 'Alexandria', 'الإسكندرية', 'full', 'bank', '2024-05'],
    ['heba', 'Heba Selim', 'هبة سليم', 'Cairo', 'القاهرة', 'manage', 'bank', '2025-08'],
    ['fady', 'Fady Habib', 'فادي حبيب', 'Toronto', 'تورونتو', 'full', 'bank', '2024-10'],
    ['ghada', 'Ghada Ashour', 'غادة عاشور', 'Cairo', 'القاهرة', 'manage', 'wallet', '2025-09'],
    ['faisal', 'Faisal Al Mutairi', 'فيصل المطيري', 'Kuwait City', 'الكويت', 'full', 'bank', '2024-07'],
    ['marwa', 'Marwa Fekry', 'مروة فكري', 'Cairo', 'القاهرة', 'manage', 'bank', '2025-10'],
    ['bassem', 'Bassem Rizk', 'باسم رزق', 'Cairo', 'القاهرة', 'full', 'bank', '2023-08'],
    ['nermine', 'Nermine Talaat', 'نرمين طلعت', 'Abu Dhabi', 'أبوظبي', 'manage', 'bank', '2025-02'],
  ] as const
).map(([id, en, ar, cityEn, cityAr, pkg, payout, since], i) => ({
  id,
  name: { en, ar },
  phone: samplePhone(i + 11),
  livesIn: { en: cityEn, ar: cityAr },
  package: pkg,
  commission: pkg === 'full' ? 0.25 : 0.2,
  payout,
  since,
}));

export const ownerById = Object.fromEntries(owners.map((o) => [o.id, o])) as Record<string, Owner>;

export const staff: Staff[] = [
  { id: 'fatma', name: { en: 'Fatma', ar: 'فاطمة' }, role: 'housekeeping', area: 'cairo' },
  { id: 'shaimaa', name: { en: 'Shaimaa', ar: 'شيماء' }, role: 'housekeeping', area: 'sheikh-zayed' },
  { id: 'sayed', name: { en: 'Sayed', ar: 'سيد' }, role: 'housekeeping', area: 'north-coast' },
  { id: 'hala', name: { en: 'Hala', ar: 'هالة' }, role: 'housekeeping', area: 'el-alamein' },
  { id: 'mona', name: { en: 'Mona', ar: 'منى' }, role: 'housekeeping', area: 'gouna' },
  { id: 'mahmoud', name: { en: 'Mahmoud', ar: 'محمود' }, role: 'maintenance', area: 'cairo' },
  { id: 'ashraf', name: { en: 'Ashraf', ar: 'أشرف' }, role: 'maintenance', area: 'north-coast' },
  { id: 'reda', name: { en: 'Reda', ar: 'رضا' }, role: 'maintenance', area: 'gouna' },
];

export const housekeeperFor = (area: AreaId) => staff.find((s) => s.role === 'housekeeping' && s.area === area)!;
export const fixerFor = (area: AreaId) =>
  staff.find((s) => s.role === 'maintenance' && s.area === area) ??
  staff.find((s) => s.role === 'maintenance' && (area === 'el-alamein' ? s.area === 'north-coast' : s.area === 'cairo'))!;

/* ---------- Units ---------- */

const numberWords = {
  en: ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'],
  ar: ['', 'بغرفة نوم', 'بغرفتي نوم', 'بثلاث غرف نوم', 'بأربع غرف نوم', 'بخمس غرف نوم', 'بست غرف نوم'],
};
const typeWords: Record<UnitType, L10n> = {
  studio: { en: 'Studio', ar: 'استوديو' },
  apartment: { en: 'apartment', ar: 'شقة' },
  chalet: { en: 'chalet', ar: 'شاليه' },
  villa: { en: 'villa', ar: 'فيلا' },
  duplex: { en: 'duplex', ar: 'دوبلكس' },
  penthouse: { en: 'penthouse', ar: 'بنتهاوس' },
  townhouse: { en: 'townhouse', ar: 'تاون هاوس' },
};

function unitName(type: UnitType, bedrooms: number, compound: Compound): L10n {
  if (type === 'studio') return { en: `Studio in ${compound.name.en}`, ar: `استوديو في ${compound.name.ar}` };
  return {
    en: `${numberWords.en[bedrooms]}-bedroom ${typeWords[type].en} in ${compound.name.en}`,
    ar: `${typeWords[type].ar} ${numberWords.ar[bedrooms]} في ${compound.name.ar}`,
  };
}

/** Winter base rates in EGP a night; the season and weekend rules apply on top (see seed.ts). */
function baseRate(area: AreaId, type: UnitType, bedrooms: number) {
  const city = { studio: 1900, 1: 2600, 2: 3600, 3: 4800 };
  if (area === 'cairo') return type === 'studio' ? city.studio : city[Math.min(bedrooms, 3) as 1 | 2 | 3];
  if (area === 'sheikh-zayed') return type === 'villa' ? 9800 + bedrooms * 600 : type === 'townhouse' ? 7500 : bedrooms === 1 ? 2500 : 3400;
  if (area === 'gouna') return type === 'studio' ? 2600 : type === 'villa' ? 6500 + bedrooms * 1000 : type === 'townhouse' ? 7200 : bedrooms === 1 ? 3400 : 4800;
  // North Coast and El Alamein: winter rates; summer runs well over double.
  if (type === 'villa') return 7000 + bedrooms * 1000;
  if (type === 'penthouse') return 8500;
  if (type === 'duplex') return 6200;
  return [0, 2800, 3800, 5200][Math.min(bedrooms, 3)];
}

const cleaningFee = (bedrooms: number, type: UnitType) =>
  type === 'villa' ? 1500 : type === 'studio' ? 500 : [0, 600, 800, 1000][Math.min(bedrooms, 3)];

const guestsFor = (type: UnitType, bedrooms: number) =>
  type === 'studio' ? 2 : type === 'villa' ? bedrooms * 2 + 1 : bedrooms === 1 ? 3 : bedrooms * 2 + (bedrooms > 2 ? 1 : 0);

/** [number in the compound, type, bedrooms]. */
const plan: Record<string, Array<[number, UnitType, number]>> = {
  MVI: [[3, 'apartment', 2], [8, 'studio', 0], [12, 'apartment', 1], [17, 'apartment', 2], [21, 'apartment', 1]],
  MVD: [[2, 'apartment', 2], [6, 'apartment', 1], [10, 'studio', 0], [15, 'apartment', 3]],
  CFC: [[4, 'studio', 0], [9, 'apartment', 1], [13, 'apartment', 1], [18, 'apartment', 2]],
  ETN: [[5, 'apartment', 1], [11, 'studio', 0], [16, 'apartment', 2]],
  ALG: [[11, 'villa', 4], [3, 'townhouse', 3], [7, 'apartment', 2], [14, 'villa', 5], [19, 'apartment', 2]],
  WTN: [[2, 'apartment', 1], [6, 'apartment', 2], [9, 'townhouse', 3]],
  MRS: [[14, 'chalet', 3], [3, 'chalet', 2], [8, 'chalet', 2], [11, 'villa', 4], [19, 'chalet', 3], [22, 'apartment', 1], [27, 'villa', 5]],
  HCB: [[4, 'chalet', 2], [9, 'chalet', 3], [12, 'villa', 4], [16, 'chalet', 2]],
  SLK: [[5, 'chalet', 2], [10, 'apartment', 1], [13, 'chalet', 3]],
  ATW: [[7, 'apartment', 2], [2, 'apartment', 1], [11, 'apartment', 2], [15, 'apartment', 3], [18, 'penthouse', 3], [23, 'apartment', 1]],
  MZR: [[4, 'apartment', 2], [8, 'apartment', 1], [12, 'apartment', 3], [17, 'duplex', 3]],
  ATM: [[21, 'apartment', 1], [3, 'studio', 0], [6, 'apartment', 1], [9, 'apartment', 2], [14, 'apartment', 2], [17, 'studio', 0], [25, 'apartment', 1]],
  WGF: [[2, 'villa', 3], [5, 'apartment', 2], [8, 'villa', 4], [12, 'apartment', 1], [15, 'townhouse', 3]],
};

/** The units the website lists, by code, so their names, sizes and photos come from the site's own file. */
const onSite = Object.fromEntries(siteData.units.map((u) => [u.code, u]));

/** Fixed owners for a few homes, so the owner portal has a story: Nadia lives in Dubai and owns two. */
const ownerOverrides: Record<string, string> = {
  'NC-MRS-014': 'nadia',
  'AL-ATW-007': 'nadia',
  'GN-ATM-021': 'omar',
  'CA-MVI-003': 'karim',
  'SZ-ALG-011': 'tarek',
};

/** Everyone but Nadia shares the other homes, one or two each (5 and 27 share no factor, so the walk visits all). */
const ownerPool = owners.filter((o) => o.id !== 'nadia');

let index = 0;
export const units: Unit[] = compounds.flatMap((compound) =>
  plan[compound.code].map(([n, type, bedrooms]) => {
    const area = areaById[compound.area];
    const code = `${area.prefix}-${compound.code}-${String(n).padStart(3, '0')}`;
    const site = onSite[code];
    const i = index++;
    const beds = site ? site.bedrooms : bedrooms;
    const kind = (site?.type ?? type) as UnitType;
    return {
      code,
      slug: site?.slug,
      name: site ? { en: site.name.en, ar: site.name.ar } : unitName(type, bedrooms, compound),
      type: kind,
      area: compound.area,
      compound: compound.code,
      bedrooms: beds,
      baths: site ? site.baths : Math.max(1, beds === 0 ? 1 : kind === 'villa' ? beds : Math.ceil(beds * 0.8)),
      guests: site ? site.guests : guestsFor(kind, beds),
      ownerId: ownerOverrides[code] ?? ownerPool[(i * 5 + 3) % ownerPool.length].id,
      rate: baseRate(compound.area, kind, beds),
      cleaningFee: cleaningFee(beds, kind),
      photo: site?.photos[0],
      // A few homes are on Airbnb only; every home is on at least one platform.
      channels: { airbnb: true, booking: i % 9 !== 4 },
    } satisfies Unit;
  }),
);

export const unitByCode = Object.fromEntries(units.map((u) => [u.code, u])) as Record<string, Unit>;
