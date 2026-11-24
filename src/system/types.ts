/**
 * The system's records, in the shape of the System Blueprint's core data model. The demo fills them
 * with sample data; the real system reads the same shapes from the database.
 */
import type { UnitType } from '@/lib/unit-types';

export type { UnitType };
export type Lang = 'en' | 'ar';
export type L10n = Record<Lang, string>;

export type AreaId = 'cairo' | 'sheikh-zayed' | 'north-coast' | 'el-alamein' | 'gouna';

export type Area = {
  id: AreaId;
  /** The first part of every unit code in the area, e.g. NC for the North Coast. */
  prefix: string;
  name: L10n;
};

export type Compound = {
  code: string;
  area: AreaId;
  name: L10n;
};

/** Where a booking came from. Airbnb and Booking.com arrive through their calendar links. */
export type Channel = 'airbnb' | 'booking' | 'direct' | 'whatsapp' | 'phone';
export type OtaChannel = Extract<Channel, 'airbnb' | 'booking'>;

export type ResStatus = 'pending' | 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled';

/** The two ways to work with Escape Away, from the company profile. */
export type Package = 'full' | 'manage';

export type Unit = {
  code: string;
  /** The website listing's address, for the units shown on the site. */
  slug?: string;
  name: L10n;
  type: UnitType;
  area: AreaId;
  compound: string;
  bedrooms: number;
  baths: number;
  guests: number;
  ownerId: string;
  /** Base nightly rate in EGP, before weekend and holiday rules. */
  rate: number;
  cleaningFee: number;
  /** A photo slot from data/images.json, only for the units the website shows. */
  photo?: string;
  channels: Record<OtaChannel, boolean>;
};

export type Owner = {
  id: string;
  name: L10n;
  phone: string;
  livesIn: L10n;
  package: Package;
  /** Management commission, as a share of net room revenue. */
  commission: number;
  payout: 'bank' | 'wallet';
  since: string;
};

export type Guest = {
  id: string;
  /** As the guest wrote it; Airbnb and Booking.com names stay in Latin letters. */
  name: string;
  phone: string;
  country: string;
  language: Lang;
  /** Stays before this sample's window. */
  pastStays: number;
};

export type Reservation = {
  id: string;
  /** Our reference (EA-…), Airbnb's confirmation code (HM…) or Booking.com's number. */
  ref: string;
  unit: string;
  channel: Channel;
  checkIn: string;
  checkOut: string;
  adults: number;
  guestId?: string;
  /** Total the guest pays in EGP, cleaning included. 0 until the team fills it for a calendar import. */
  total: number;
  paid: number;
  status: ResStatus;
  /** Arrived through a calendar link with dates only: the team still owes name, phone and price. */
  needsDetails?: boolean;
  /** When the calendar link last carried this booking (ISO time), for Airbnb and Booking.com. */
  syncedAt?: string;
  createdAt: string;
};

export type Block = {
  id: string;
  unit: string;
  start: string;
  end: string;
  reason: 'owner' | 'maintenance';
};

export type Staff = {
  id: string;
  name: L10n;
  role: 'housekeeping' | 'maintenance';
  area: AreaId;
};

export type TaskType = 'turnover' | 'inspection' | 'maintenance';

export type Task = {
  id: string;
  unit: string;
  type: TaskType;
  date: string;
  /** Local times, e.g. ["12:00", "15:00"]. */
  window: [string, string];
  staffId: string;
  status: 'todo' | 'doing' | 'done';
  reservationId?: string;
  issue?: L10n;
};

export type LeadStage = 'new' | 'contacted' | 'visit' | 'signed' | 'lost';
export type LeadScore = 'hot' | 'warm' | 'cool' | 'nurture';

export type Lead = {
  id: string;
  name: string;
  phone: string;
  area: AreaId;
  compound: L10n;
  type: UnitType;
  bedrooms: number;
  furnished: boolean;
  stage: LeadStage;
  score: LeadScore;
  source: 'website' | 'instagram' | 'referral' | 'whatsapp';
  createdAt: string;
  followUp?: string;
  note?: L10n;
};

/** One calendar link the system reads for a unit. */
export type Feed = {
  unit: string;
  channel: OtaChannel;
  lastSync: string;
  ok: boolean;
};

/** A message the system sent the team, shown as it would arrive on WhatsApp. */
export type TeamAlert = {
  id: string;
  at: string;
  kind: 'block' | 'clash' | 'task';
  text: L10n;
};

export type Payout = {
  ownerId: string;
  month: string;
  status: 'draft' | 'approved' | 'paid';
};

export type DemoData = {
  today: string;
  now: string;
  units: Unit[];
  owners: Owner[];
  guests: Guest[];
  reservations: Reservation[];
  blocks: Block[];
  staff: Staff[];
  tasks: Task[];
  leads: Lead[];
  feeds: Feed[];
  alerts: TeamAlert[];
  payouts: Payout[];
};
