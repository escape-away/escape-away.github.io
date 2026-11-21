'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import type { ExplorerPhoto } from '@/lib/explorer';
import { formatNumber } from '@/lib/format';
import { lenis } from '@/lib/search-state';
import { ChevronIcon, CloseIcon } from '../explorer/icons';
import { SlotImage } from '../slot-image';

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The listing's photographs. Desktop: the lead photo in the soft arch beside a grid of four, with
 * "Show all photos". Phones: one row to swipe through, with a count. Any photo opens the viewer: every
 * photo full size, one at a time, by swipe, arrow keys (mirrored in Arabic) or the buttons.
 */
export function Gallery({ photos, name }: { photos: ExplorerPhoto[]; name: string }) {
  const t = useTranslations('listing');
  const locale = useLocale() as Locale;
  const id = useId();
  const count = photos.length;
  const n = (v: number) => formatNumber(locale, v);

  const row = useRef<HTMLUListElement>(null);
  const [rowIndex, setRowIndex] = useState(0);

  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  // On phones, the count follows the photo in view.
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setRowIndex(Number((e.target as HTMLElement).dataset.index));
      },
      { root: el, threshold: 0.6 },
    );
    el.querySelectorAll('li').forEach((li) => io.observe(li));
    return () => io.disconnect();
  }, []);

  // In the viewer, the count follows the photo in view, however it got there.
  useEffect(() => {
    const el = track.current;
    if (!el || !open) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setIndex(Number((e.target as HTMLElement).dataset.index));
      },
      { root: el, threshold: 0.6 },
    );
    el.querySelectorAll('figure').forEach((f) => io.observe(f));
    return () => io.disconnect();
  }, [open]);

  const go = useCallback((i: number, smooth = true) => {
    const slide = track.current?.children[i] as HTMLElement | undefined;
    slide?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: smooth && !reduceMotion() ? 'smooth' : 'instant' });
  }, []);

  const show = (i: number, from: HTMLElement) => {
    const d = dialog.current;
    if (!d) return;
    opener.current = from;
    d.showModal();
    lenis()?.stop();
    setOpen(true);
    setIndex(i);
    // Straight to the photo that was tapped, without travelling past the others.
    requestAnimationFrame(() => go(i, false));
  };

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onClose = () => {
      setOpen(false);
      lenis()?.start();
      opener.current?.focus();
    };
    d.addEventListener('close', onClose);
    return () => d.removeEventListener('close', onClose);
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    const rtl = document.documentElement.dir === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === forward) go(Math.min(count - 1, index + 1));
    else if (e.key === back) go(Math.max(0, index - 1));
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(count - 1);
    else return;
    e.preventDefault();
  };

  if (!count) return <div className="gallery gallery--empty soft-arch" aria-hidden="true" />;

  return (
    <div className="gallery-wrap">
      <ul ref={row} className="gallery" data-count={Math.min(count, 5)} aria-label={t('photosOf', { name })}>
        {photos.map((p, i) => (
          <li key={p.slot} className="gallery__tile" data-index={i}>
            <button
              type="button"
              className="gallery__open"
              aria-label={`${p.alt.replace(/[.!?؟]\s*$/, '')}. ${t('openPhoto', { index: n(i + 1), count: n(count) })}`}
              aria-haspopup="dialog"
              onClick={(e) => show(i, e.currentTarget)}
            >
              <SlotImage
                slot={p.slot}
                alt=""
                width={p.width}
                height={p.height}
                sizes={i === 0 ? '(max-width: 48rem) 88vw, 50vw' : '(max-width: 48rem) 88vw, 22vw'}
                eager={i === 0}
                color={p.color}
              />
            </button>
          </li>
        ))}
      </ul>

      {count > 1 ? (
        <>
          <p className="gallery__count tabular" aria-hidden="true">
            {t('photoOf', { index: n(rowIndex + 1), count: n(count) })}
          </p>
          <button
            type="button"
            className="btn btn--small gallery__all"
            aria-haspopup="dialog"
            onClick={(e) => show(0, e.currentTarget)}
          >
            {t('showAll', { count, countText: n(count) })}
          </button>
        </>
      ) : null}

      <dialog
        ref={dialog}
        className="viewer"
        aria-labelledby={`${id}-viewer-title`}
        onKeyDown={onKeyDown}
        data-lenis-prevent
      >
        <div className="viewer__bar">
          <h2 id={`${id}-viewer-title`} className="viewer__title">
            {name}
          </h2>
          <p className="viewer__count tabular" aria-live="polite">
            {t('photoOf', { index: n(index + 1), count: n(count) })}
          </p>
          <button type="button" className="viewer__close" aria-label={t('closePhotos')} title={t('closePhotos')} onClick={() => dialog.current?.close()}>
            <CloseIcon />
          </button>
        </div>
        <div ref={track} className="viewer__track">
          {photos.map((p, i) => (
            <figure key={p.slot} className="viewer__slide" data-index={i}>
              <SlotImage slot={p.slot} alt={p.alt} width={p.width} height={p.height} sizes="100vw" color={p.color} />
            </figure>
          ))}
        </div>
        {count > 1 ? (
          <>
            <button
              type="button"
              className="viewer__nav viewer__nav--back"
              aria-label={t('prevPhoto')}
              title={t('prevPhoto')}
              disabled={index === 0}
              onClick={() => go(index - 1)}
            >
              <ChevronIcon className="icon--back" />
            </button>
            <button
              type="button"
              className="viewer__nav viewer__nav--next"
              aria-label={t('nextPhoto')}
              title={t('nextPhoto')}
              disabled={index === count - 1}
              onClick={() => go(index + 1)}
            >
              <ChevronIcon />
            </button>
          </>
        ) : null}
      </dialog>
    </div>
  );
}
