'use client';

import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { common, useCopy, useLang } from '../copy';
import { DemoProvider, useDemo } from '../store';
import { Tour } from '../tour';

function Toasts() {
  const lang = useLang();
  const { toasts, dismissToast } = useDemo();
  const c = useCopy(common);
  const icon = { success: CircleCheck, warning: TriangleAlert, error: TriangleAlert, info: Info };
  return (
    <ol className="sys-toasts" aria-live="polite">
      {toasts.map((t) => {
        const Icon = icon[t.tone];
        return (
          <li key={t.id} className="sys-toast" data-tone={t.tone}>
            <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
            <p>{t.text[lang]}</p>
            <button type="button" className="sys-btn sys-btn--quiet sys-btn--icon sys-btn--small" aria-label={c.close} onClick={() => dismissToast(t.id)}>
              <X size={15} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Overlays() {
  const { data, tour } = useDemo();
  return (
    <div className="sys sys-layer">
      <Toasts />
      {data && tour.open ? <Tour /> : null}
    </div>
  );
}

/** Wraps every system screen (admin, housekeeping, owner portal): one demo memory, one tour, one toast list. */
export function SystemRoot({ children }: { children: ReactNode }) {
  return (
    <DemoProvider>
      {children}
      <Overlays />
    </DemoProvider>
  );
}
