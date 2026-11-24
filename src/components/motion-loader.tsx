'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type Libs = {
  gsap: typeof import('gsap').gsap;
  ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger;
};

let libs: Promise<Libs> | null = null;

/** GSAP, ScrollTrigger and Lenis load once, after the visitor first scrolls, taps or types. */
function loadLibs() {
  libs ??= (async () => {
    const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
      import('lenis'),
    ]);
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ autoRaf: false, lerp: 0.12 });
    (window as unknown as { __lenis?: unknown }).__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    return { gsap, ScrollTrigger };
  })();
  return libs;
}

/**
 * The scroll scenes: the destinations' horizontal travel on wider screens, the collections' and the
 * destinations' travel on phones, and the turn from cream to navy.
 */
function scenes({ gsap, ScrollTrigger }: Libs) {
  const mm = gsap.matchMedia();
  const header = () => document.querySelector<HTMLElement>('header')?.offsetHeight ?? 64;

  /** Slides a pinned section's row sideways as the page scrolls through it. */
  const travel = (section: HTMLElement, track: HTMLElement, viewport: HTMLElement) => {
    const rtl = getComputedStyle(section).direction === 'rtl';
    gsap.to(track, {
      x: () => (rtl ? 1 : -1) * Math.max(0, track.scrollWidth - viewport.clientWidth),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: () => `top ${header()}px`,
        end: 'bottom bottom',
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });
  };

  // Phones: the same query as the pinned phone layout in home.css.
  mm.add('(max-width: 47.99rem) and (min-height: 36rem) and (prefers-reduced-motion: no-preference)', () => {
    document.querySelectorAll<HTMLElement>('[data-pin]').forEach((section) => {
      const track = section.querySelector<HTMLElement>('[data-pin-track]');
      const viewport = section.querySelector<HTMLElement>('[data-pin-viewport]');
      if (track && viewport) travel(section, track, viewport);
    });
  });

  const dest = document.querySelector<HTMLElement>('[data-dest]');
  if (dest) {
    // Same query as the pinned layout in home.css.
    mm.add('(min-width: 48rem) and (min-height: 46rem) and (prefers-reduced-motion: no-preference)', () => {
      const track = dest.querySelector<HTMLElement>('[data-dest-track]');
      const viewport = dest.querySelector<HTMLElement>('[data-dest-viewport]');
      if (track && viewport) travel(dest, track, viewport);
    });
  }

  const turn = document.querySelector<HTMLElement>('[data-turn]');
  const veil = turn?.querySelector<HTMLElement>('[data-turn-veil]');
  if (turn && veil) {
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // The cream veil over the section's navy fades as the section rises: the page turns to navy.
      // Both the veil and the intro's fade finish while the intro is still entering (its top at 80% of
      // the screen), so wherever a reader stops, the light text they can read sits on navy at full
      // strength (6.9:1). Ending later left it half-faded mid-screen, about 2.5:1.
      const reveal = turn.querySelector<HTMLElement>('[data-turn-reveal]');
      gsap.fromTo(
        veil,
        { opacity: 1 },
        {
          opacity: 0,
          ease: 'none',
          scrollTrigger: { trigger: turn, start: 'top bottom', endTrigger: reveal ?? turn, end: reveal ? 'top 80%' : 'top 35%', scrub: true },
        },
      );
      if (reveal) {
        gsap.fromTo(
          reveal,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, ease: 'none', scrollTrigger: { trigger: reveal, start: 'top bottom', end: 'top 80%', scrub: true } },
        );
      }
    });
  }

  // The scenes measure where they start once. Content above them changes height later (the
  // explorer's results, "Show more", sections laid out as the reader nears them, a late font), so
  // they measure again once the page's height settles, and only when it really changed.
  let measured = document.documentElement.scrollHeight;
  let timer = 0;
  const resized = new ResizeObserver(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (Math.abs(document.documentElement.scrollHeight - measured) < 2) return;
      ScrollTrigger.refresh();
      measured = document.documentElement.scrollHeight;
    }, 250);
  });
  resized.observe(document.body);

  return () => {
    resized.disconnect();
    window.clearTimeout(timer);
    mm.revert();
  };
}

export function MotionLoader() {
  const pathname = usePathname();
  const [ready, setReady] = useState<Libs | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let done = false;
    const events = ['scroll', 'wheel', 'touchstart', 'keydown'] as const;
    const start = () => {
      if (done) return;
      done = true;
      events.forEach((e) => window.removeEventListener(e, start));
      // If the motion code can't load, fall back to the plain swipe row for the destinations.
      loadLibs().then(setReady, () => document.documentElement.classList.add('no-motion'));
    };
    events.forEach((e) => window.addEventListener(e, start, { passive: true }));
    // If the visitor reads without scrolling, load once the page is idle so the scenes are ready.
    const idle = window.requestIdleCallback ? window.requestIdleCallback(start, { timeout: 4000 }) : window.setTimeout(start, 3000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, start));
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle as number);
      else window.clearTimeout(idle as number);
    };
  }, []);

  // Rebuild the scenes for each page, after the new page's markup is in place.
  useEffect(() => {
    if (!ready) return;
    const teardown = scenes(ready);
    return teardown;
  }, [ready, pathname]);

  return null;
}
