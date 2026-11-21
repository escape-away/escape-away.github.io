'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import { matchesAll, normalize } from '@/lib/normalize';
import type { WhereOption } from '@/lib/search-options';

type Props = {
  id: string;
  locale: Locale;
  options: WhereOption[];
  text: string;
  open: boolean;
  onOpen: (open: boolean) => void;
  onText: (text: string) => void;
  onPick: (option: WhereOption) => void;
};

/** A combobox of destinations and compounds that matches Arabic and Latin spellings alike. */
export function WhereField({ id, locale, options, text, open, onOpen, onText, onPick }: Props) {
  const t = useTranslations('search');
  const [active, setActive] = useState(-1);
  const query = normalize(text);

  const list = useMemo(() => {
    const found = query ? options.filter((o) => matchesAll(o.keys, query)) : options.filter((o) => o.kind === 'destination');
    return found.slice(0, 8);
  }, [options, query]);

  const choose = (option: WhereOption) => {
    onPick(option);
    setActive(-1);
    onOpen(false);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onOpen(true);
      setActive((i) => Math.min(i + 1, list.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open && active >= 0 && list[active]) {
      e.preventDefault();
      choose(list[active]);
    }
  };

  return (
    <>
      <input
        id={id}
        className="search__input"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${id}-opt-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={t('wherePlaceholder')}
        value={text}
        onChange={(e) => {
          onText(e.target.value);
          onOpen(true);
          setActive(-1);
        }}
        onFocus={() => onOpen(true)}
        onKeyDown={onKey}
      />
      <div className="pop pop--where" data-open={open || undefined}>
        {list.length > 0 ? (
          <ul id={`${id}-list`} role="listbox" aria-label={t('where')} className="opts">
            {list.map((option, i) => (
              <li
                key={`${option.kind}-${option.value}`}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                data-active={i === active || undefined}
                className="opt"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => choose(option)}
              >
                <span className="opt__label">{option.label[locale]}</span>
                <span className="opt__sub">
                  {option.kind === 'destination' ? t('destination') : t('compoundIn', { area: option.in?.[locale] ?? '' })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p id={`${id}-list`} className="opts-empty" role="status">
            {t('whereEmpty')}
          </p>
        )}
      </div>
    </>
  );
}
