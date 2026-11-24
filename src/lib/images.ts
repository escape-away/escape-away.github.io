import slotsRaw from '@data/images.json';
import generated from '@/generated/images.json';
import type { Locale } from '@/i18n/routing';

type SlotRecord = {
  slot: string;
  /**
   * original: Escape Away's own photograph. stock: a licensed stock photo (Unsplash License: no credit
   * required; its page and photographer stay on record here). generated: Escape Away's own AI-made mood image.
   */
  status: 'stock' | 'original' | 'generated';
  src?: string;
  page?: string;
  photographer?: string;
  licence?: string;
  alt: Record<Locale, string>;
};

type Generated = Record<string, { width: number; height: number; color: string }>;

const slots = (slotsRaw as { slots: SlotRecord[] }).slots;
const sizes = generated as Generated;

export type ImageSlot = SlotRecord & { width: number; height: number; color: string };

/** A photo slot with its pre-resized size and placeholder colour, or undefined if it has no file yet. */
export function imageSlot(slot: string): ImageSlot | undefined {
  const record = slots.find((s) => s.slot === slot);
  const size = sizes[slot];
  if (!record || !size) return undefined;
  return { ...record, ...size };
}

/**
 * The first of a unit's photo slots that has a file, so a card or a gallery leads with a real
 * photograph even while a newer slot is still waiting to be downloaded.
 */
export function firstPhoto(slots: string[]) {
  return slots.find((slot) => imageSlot(slot)) ?? slots[0] ?? '';
}
