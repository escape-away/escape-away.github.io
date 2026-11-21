/**
 * next/image loader for the static export. scripts/images.mjs pre-resizes every photo slot
 * into public/img/<slot>/<width>.webp at the widths in next.config.ts (imageSizes + deviceSizes),
 * so this only has to point at the right file.
 */
export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }) {
  if (src.startsWith('/img/')) return `${src.replace(/\/+$/, '')}/${width}.webp`;
  return src;
}
