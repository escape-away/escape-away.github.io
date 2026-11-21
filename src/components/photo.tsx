import type { Locale } from '@/i18n/routing';
import { imageSlot } from '@/lib/images';
import { SlotImage } from './slot-image';

type Props = {
  slot: string;
  locale: Locale;
  /** The width this photo takes at each breakpoint, e.g. "(max-width: 768px) 100vw, 50vw". */
  sizes: string;
  className?: string;
  /** For the one photo that is the page's largest paint. */
  eager?: boolean;
};

/**
 * A photo by slot ID. Alt text comes from data/images.json in the page's language; the files are
 * pre-resized at build (AVIF with a WebP fallback). A slot with no file yet renders the sand
 * placeholder instead of a broken image.
 */
export function Photo({ slot, locale, sizes, className = '', eager = false }: Props) {
  const image = imageSlot(slot);
  if (!image) return <span aria-hidden="true" className={`block size-full bg-sand ${className}`} />;

  return (
    <SlotImage
      slot={slot}
      alt={image.alt[locale]}
      width={image.width}
      height={image.height}
      sizes={sizes}
      eager={eager}
      className={className}
      color={image.color}
    />
  );
}
