'use client';

import { Fragment, type ReactNode } from 'react';
import { channelLabel, phase as phases, statusLabel, useLang } from '../copy';
import type { Channel, Guest, Reservation, ResStatus, Unit } from '../types';

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'done';

export const statusTone: Record<ResStatus, Tone> = {
  pending: 'warn',
  confirmed: 'ok',
  'checked-in': 'info',
  'checked-out': 'done',
  cancelled: 'bad',
};

/** A booking's state: a tint and always its word, never colour alone. */
export function StatusBadge({ status }: { status: ResStatus }) {
  const lang = useLang();
  return (
    <span className="sys-badge" data-tone={statusTone[status]}>
      {statusLabel[status][lang]}
    </span>
  );
}

export function Badge({ tone, children, plain }: { tone?: Tone; children: ReactNode; plain?: boolean }) {
  return (
    <span className={`sys-badge${plain ? ' sys-badge--plain' : ''}`} data-tone={tone}>
      {children}
    </span>
  );
}

/** Channels are neutral outlined tags with the name written out, never the platforms' own colours. */
export function ChannelChip({ channel }: { channel: Channel }) {
  const lang = useLang();
  return (
    <span className="sys-chip">
      <bdi>{channelLabel[channel][lang]}</bdi>
    </span>
  );
}

export function PhaseTag({ phase }: { phase: keyof typeof phases }) {
  const lang = useLang();
  return (
    <span className="sys-phase" title={phases[phase].hint[lang]}>
      {phases[phase].label[lang]}
    </span>
  );
}

export function PageHead({
  title,
  sub,
  phase,
  actions,
}: {
  title: ReactNode;
  sub?: ReactNode;
  phase?: keyof typeof phases;
  actions?: ReactNode;
}) {
  return (
    <header className="sys-head">
      <div className="sys-head__titles">
        <h1 className="sys-title">
          {title}
          {phase ? <PhaseTag phase={phase} /> : null}
        </h1>
        {sub ? <p className="sys-head__sub">{sub}</p> : null}
      </div>
      {actions ? <div className="sys-head__actions">{actions}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  meta,
  action,
  children,
  flush,
  className = '',
}: {
  title?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  className?: string;
}) {
  return (
    <section className={`sys-panel ${className}`.trim()}>
      {title ? (
        <header className="sys-panel__head">
          <h2>{title}</h2>
          {meta ? <span className="sys-muted">{meta}</span> : null}
          {action ? <div>{action}</div> : null}
        </header>
      ) : null}
      {flush ? children : <div className="sys-panel__body">{children}</div>}
    </section>
  );
}

export function Empty({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="sys-empty">
      <b>{title}</b>
      {children}
    </div>
  );
}

/**
 * A meta line of parts joined by " · ". Each part is isolated, so in Arabic a number stays with its
 * word ("4 ليالي") and a Latin name never splices into its neighbours.
 */
export function Dots({ parts }: { parts: ReactNode[] }) {
  const list = parts.filter((p) => p !== null && p !== undefined && p !== false && p !== '');
  return (
    <>
      {list.map((p, i) => (
        <Fragment key={i}>
          {i > 0 ? ' · ' : null}
          <bdi>{p}</bdi>
        </Fragment>
      ))}
    </>
  );
}

/** A unit code always reads left to right, even inside Arabic. */
export function Code({ children }: { children: ReactNode }) {
  return <span className="sys-code">{children}</span>;
}

export function GuestName({ res, guest, missing }: { res: Reservation; guest?: Guest; missing: string }) {
  if (!guest) {
    return (
      <span>
        <bdi>{channelLabel[res.channel].en}</bdi> · {missing}
      </span>
    );
  }
  return <bdi>{guest.name}</bdi>;
}

export function UnitLine({ unit, lang }: { unit: Unit; lang: 'en' | 'ar' }) {
  return (
    <>
      <Code>{unit.code}</Code> · {unit.name[lang]}
    </>
  );
}
