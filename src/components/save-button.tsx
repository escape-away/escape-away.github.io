'use client';

import { useTranslations } from 'next-intl';
import { toggleSaved, useSaved } from '@/lib/saved';
import { HeartIcon } from './explorer/icons';

/**
 * The heart that saves a stay on this device. On a card it sits on the photo's corner, above the
 * card's link; on a listing it is a small pill beside the place. Its name stays the same either way
 * ("Save Villa …"); pressed says whether it is saved, so screen readers hear both.
 */
export function SaveButton({ slug, name, variant = 'card' }: { slug: string; name: string; variant?: 'card' | 'page' }) {
  const t = useTranslations('saved');
  const saved = useSaved().includes(slug);

  return (
    <button
      type="button"
      className={`save save--${variant}`}
      aria-pressed={saved}
      aria-label={variant === 'card' ? t('save', { name }) : undefined}
      onClick={() => toggleSaved(slug)}
    >
      <HeartIcon className="save__icon" />
      {variant === 'page' ? <span>{t('saveShort')}</span> : null}
    </button>
  );
}
