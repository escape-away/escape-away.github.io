/**
 * The system's shared words in both languages. Arabic is written as its own copy (clear standard
 * Arabic for labels, Egyptian warmth in short lines), following the brand's messaging file. Kept out
 * of the website's message files so guest pages never download the system's words.
 */
import { useLocale } from 'next-intl';
import type { Channel, L10n, Lang, LeadScore, LeadStage, ResStatus, TaskType } from './types';

export function useLang(): Lang {
  return useLocale() === 'ar' ? 'ar' : 'en';
}

/** Picks a screen's copy for the page's language; Arabic must carry every English key. */
export function useCopy<T>(copy: { en: T; ar: T }): T {
  return copy[useLang()];
}

export const tx = (text: L10n, lang: Lang) => text[lang];

export const nav = {
  today: { en: 'Today', ar: 'النهاردة' },
  calendar: { en: 'Calendar', ar: 'التقويم' },
  reservations: { en: 'Reservations', ar: 'الحجوزات' },
  units: { en: 'Units', ar: 'الوحدات' },
  owners: { en: 'Owners', ar: 'الملاك' },
  guests: { en: 'Guests', ar: 'الضيوف' },
  leads: { en: 'Leads', ar: 'طلبات الملاك' },
  payouts: { en: 'Payouts', ar: 'المدفوعات' },
  reports: { en: 'Reports', ar: 'التقارير' },
  settings: { en: 'Settings', ar: 'الإعدادات' },
} satisfies Record<string, L10n>;

export type NavKey = keyof typeof nav;

export const statusLabel: Record<ResStatus, L10n> = {
  pending: { en: 'Pending', ar: 'في انتظار الدفع' },
  confirmed: { en: 'Confirmed', ar: 'مؤكد' },
  'checked-in': { en: 'Checked in', ar: 'تم الوصول' },
  'checked-out': { en: 'Checked out', ar: 'تم المغادرة' },
  cancelled: { en: 'Cancelled', ar: 'ملغي' },
};

export const channelLabel: Record<Channel, L10n> = {
  airbnb: { en: 'Airbnb', ar: 'Airbnb' },
  booking: { en: 'Booking.com', ar: 'Booking.com' },
  direct: { en: 'Website', ar: 'الموقع' },
  whatsapp: { en: 'WhatsApp', ar: 'واتساب' },
  phone: { en: 'Phone', ar: 'تليفون' },
};

/** The two-letter tags inside calendar bars, from the brand's system rules (AB, BK, DR), plus WA and PH. */
export const channelTag: Record<Channel, string> = {
  airbnb: 'AB',
  booking: 'BK',
  direct: 'DR',
  whatsapp: 'WA',
  phone: 'PH',
};

export const blockLabel = {
  owner: { en: 'Owner stay', ar: 'إقامة المالك' },
  maintenance: { en: 'Maintenance', ar: 'صيانة' },
} satisfies Record<string, L10n>;

export const taskLabel: Record<TaskType, L10n> = {
  turnover: { en: 'Turnover clean', ar: 'تنظيف بعد المغادرة' },
  inspection: { en: 'Inspection', ar: 'معاينة' },
  maintenance: { en: 'Maintenance', ar: 'صيانة' },
};

export const taskStatus = {
  todo: { en: 'To do', ar: 'لسه' },
  doing: { en: 'In progress', ar: 'شغالين فيها' },
  done: { en: 'Done', ar: 'خلصت' },
} satisfies Record<string, L10n>;

export const stageLabel: Record<LeadStage, L10n> = {
  new: { en: 'New', ar: 'جديد' },
  contacted: { en: 'Contacted', ar: 'تم التواصل' },
  visit: { en: 'Visit booked', ar: 'معاينة محددة' },
  signed: { en: 'Signed', ar: 'تم التعاقد' },
  lost: { en: 'Lost', ar: 'لم يكتمل' },
};

export const scoreLabel: Record<LeadScore, L10n> = {
  hot: { en: 'Hot: call within the hour', ar: 'ساخن: كلّمه خلال ساعة' },
  warm: { en: 'Warm: call today', ar: 'دافئ: كلّمه النهاردة' },
  cool: { en: 'Cool: message first', ar: 'هادئ: ابعتله رسالة الأول' },
  nurture: { en: 'Nurture: keep in touch', ar: 'متابعة: خليك على تواصل' },
};

export const scoreShort: Record<LeadScore, L10n> = {
  hot: { en: 'Hot', ar: 'ساخن' },
  warm: { en: 'Warm', ar: 'دافئ' },
  cool: { en: 'Cool', ar: 'هادئ' },
  nurture: { en: 'Nurture', ar: 'متابعة' },
};

export const sourceLabel = {
  website: { en: 'Website form', ar: 'فورم الموقع' },
  instagram: { en: 'Instagram ad', ar: 'إعلان إنستجرام' },
  referral: { en: 'Referral', ar: 'ترشيح' },
  whatsapp: { en: 'WhatsApp', ar: 'واتساب' },
} satisfies Record<string, L10n>;

export const packageLabel = {
  full: { en: 'Full service', ar: 'الخدمة الكاملة' },
  manage: { en: 'Management only', ar: 'إدارة فقط' },
} satisfies Record<string, L10n>;

export const phase = {
  core: {
    label: { en: 'Core', ar: 'الأساس' },
    hint: { en: 'In the first release', ar: 'في أول إصدار' },
  },
  wave2: {
    label: { en: 'Wave 2', ar: 'المرحلة الثانية' },
    hint: { en: 'Follows the first release', ar: 'بعد أول إصدار' },
  },
} satisfies Record<string, { label: L10n; hint: L10n }>;

export const common = {
  en: {
    sample: 'Sample data',
    sampleHint: 'Every name, unit and number here is made up for the demo.',
    tour: 'Guided demo',
    search: 'Search guests, phones, references',
    searchShort: 'Search',
    newBooking: 'New booking',
    close: 'Close',
    menu: 'Menu',
    system: 'System',
    staffApp: 'Housekeeping app',
    ownerPortal: 'Owner portal',
    website: 'Website',
    reset: 'Reset the demo',
    loading: 'Loading the board…',
    needsDetails: 'Needs details',
    clash: 'Clash',
    lastSynced: 'Last synced',
    noResults: 'Nothing matches that.',
    viewAll: 'View all',
    nightsShort: 'n',
    user: 'Reem · Reservations',
  },
  ar: {
    sample: 'بيانات تجريبية',
    sampleHint: 'كل الأسماء والوحدات والأرقام هنا متألفة للعرض.',
    tour: 'جولة تعريفية',
    search: 'دوّر على ضيف أو رقم أو كود حجز',
    searchShort: 'بحث',
    newBooking: 'حجز جديد',
    close: 'إغلاق',
    menu: 'القائمة',
    system: 'السيستم',
    staffApp: 'تطبيق النضافة',
    ownerPortal: 'بوابة الملاك',
    website: 'الموقع',
    reset: 'ابدأ العرض من الأول',
    loading: 'بنجهّز اللوحة…',
    needsDetails: 'ناقص البيانات',
    clash: 'تعارض',
    lastSynced: 'آخر تحديث',
    noResults: 'مفيش نتايج.',
    viewAll: 'عرض الكل',
    nightsShort: 'ل',
    user: 'ريم · الحجوزات',
  },
};
