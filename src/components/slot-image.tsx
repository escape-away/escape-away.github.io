import { getImageProps } from 'next/image';
import { PhotoPreload } from './photo-preload';

type Props = {
  /** The photo slot in data/images.json; scripts/images.mjs writes its files to public/img/<slot>/. */
  slot: string;
  alt: string;
  width: number;
  height: number;
  /** The width this photo takes at each breakpoint, e.g. "(max-width: 768px) 100vw, 50vw". */
  sizes: string;
  /** For the one photo that is the page's largest paint: fetched first, and preloaded. */
  eager?: boolean;
  className?: string;
  /** The photo's average colour, shown until it arrives. */
  color?: string;
};

/**
 * A pre-resized photo: AVIF for the browsers that can show it (about 40% lighter at the same look),
 * WebP for the rest. The <picture> takes no box of its own (display: contents), so frames that size
 * their photo with `> picture > img` keep working. Works in server and client components.
 */
export function SlotImage({ slot, alt, width, height, sizes, eager = false, className, color }: Props) {
  const { props } = getImageProps({
    src: `/img/${slot}`,
    alt,
    width,
    height,
    sizes,
    loading: eager ? 'eager' : 'lazy',
    fetchPriority: eager ? 'high' : undefined,
    decoding: 'async',
    className: className || undefined,
    style: color ? { backgroundColor: color } : undefined,
  });
  const avifSrcSet = props.srcSet?.replace(/\.webp(?=\s)/g, '.avif');
  const avifSrc = typeof props.src === 'string' ? props.src.replace(/\.webp$/, '.avif') : '';

  return (
    <>
      {/* Lifted into <head> (it has an href); kept out of the page data that prefetches carry (see
          PhotoPreload). `type` makes browsers without AVIF skip it; the <source> below reuses the file. */}
      {eager && avifSrcSet && avifSrc ? <PhotoPreload href={avifSrc} srcSet={avifSrcSet} sizes={sizes} /> : null}
      <picture className="contents">
        {avifSrcSet ? <source type="image/avif" srcSet={avifSrcSet} sizes={sizes} /> : null}
        {/* eslint-disable-next-line @next/next/no-img-element -- next/image can't offer a second format */}
        <img {...props} alt={alt} />
      </picture>
    </>
  );
}
