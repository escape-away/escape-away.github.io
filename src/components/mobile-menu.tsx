'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { lenis } from '@/lib/search-state';
import { EaMark } from './ea-mark';
import { CloseIcon } from './explorer/icons';
import { LanguageSwitch } from './language-switch';

type Href = string | { pathname: string; hash?: string };
type Item = { key: string; href: Href; label: string };

/**
 * The phone menu: a full screen over the page, as DESIGN.md asks, opened from the header's Menu
 * button. A native modal dialog, so the page behind can't be reached by Tab, Esc closes it, and focus
 * returns to the button. Each link closes it first, so a section link scrolls the page it uncovers.
 * Without JavaScript, Menu is a link to the footer, which carries every page.
 */
export function MobileMenu({
  items,
  strings,
  whatsapp,
}: {
  items: readonly Item[];
  strings: { menu: string; close: string; home: string; primary: string; whatsapp: string; switchTo: string };
  whatsapp: string;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    setReady(true);
    const onClose = () => lenis()?.start();
    d.addEventListener('close', onClose);
    return () => d.removeEventListener('close', onClose);
  }, []);

  const open = () => {
    const d = dialog.current;
    if (!d || d.open) return;
    d.showModal();
    lenis()?.stop();
  };
  // Scrolling starts again before a link moves the page.
  const close = () => {
    lenis()?.start();
    dialog.current?.close();
  };

  return (
    <>
      {ready ? (
        <button
          type="button"
          className="inline-flex min-h-11 cursor-pointer items-center text-[length:var(--text-small)] font-medium"
          aria-haspopup="dialog"
          onClick={open}
        >
          {strings.menu}
        </button>
      ) : (
        <a href="#site-footer" className="inline-flex min-h-11 items-center text-[length:var(--text-small)] font-medium no-underline">
          {strings.menu}
        </a>
      )}
      <dialog ref={dialog} className="menu-sheet" aria-labelledby={`${id}-title`} data-lenis-prevent>
        <div className="menu-sheet__inner wrap">
          <div className="menu-sheet__head">
            <Link href="/" aria-label={strings.home} className="inline-flex min-h-11 items-center text-espresso" onClick={close}>
              <EaMark />
            </Link>
            <h2 id={`${id}-title`} className="sr-only">
              {strings.menu}
            </h2>
            <button type="button" className="menu-sheet__close" aria-label={strings.close} title={strings.close} onClick={close}>
              <CloseIcon />
            </button>
          </div>
          <nav aria-label={strings.primary}>
            <ul className="menu-sheet__list">
              {items.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className="menu-sheet__link" onClick={close}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="menu-sheet__foot">
            <a href={whatsapp} target="_blank" rel="noopener" className="btn btn--primary" onClick={close}>
              {strings.whatsapp}
            </a>
            <LanguageSwitch text={strings.switchTo} className="link-underline inline-flex min-h-11 items-center" />
          </div>
        </div>
      </dialog>
    </>
  );
}
