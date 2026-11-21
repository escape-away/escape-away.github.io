'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * The hero's arrival: the arch opens from 86% while the photo inside settles from 116%. It starts
 * visible (so the photo counts as the first paint) and moves once the photo has decoded.
 * Reduced motion sets both scales to 1 in the tokens, so nothing moves.
 */
export function ArchArrival({ className = '', children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    const img = ref.current?.querySelector('img');
    let cancelled = false;
    const go = () => {
      if (!cancelled) requestAnimationFrame(() => setArrived(true));
    };
    if (!img) go();
    else if (img.complete) img.decode().then(go, go);
    else {
      img.addEventListener('load', go, { once: true });
      img.addEventListener('error', go, { once: true });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div ref={ref} className={`arch arch-arrival ${arrived ? 'is-arrived' : ''} ${className}`}>
      {children}
    </div>
  );
}
