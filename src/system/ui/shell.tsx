'use client';

import {
  Banknote,
  CalendarDays,
  ChartColumn,
  Compass,
  House,
  Inbox,
  LayoutList,
  Menu,
  RotateCcw,
  Search,
  Settings,
  Smartphone,
  Sun,
  UserRound,
  Users,
  Globe,
  KeyRound,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { EaMark } from '@/components/ea-mark';
import { LanguageSwitch } from '@/components/language-switch';
import { Link, usePathname } from '@/i18n/navigation';
import { unitByCode } from '../catalog';
import { common, nav, useCopy, useLang, type NavKey } from '../copy';
import { stayRange } from '../format';
import { clashes, needsDetails } from '../select';
import { useDemo } from '../store';
import { PanelHost } from './panels';

const items: Array<{ key: NavKey; href: string; icon: LucideIcon }> = [
  { key: 'today', href: '/admin', icon: Sun },
  { key: 'calendar', href: '/admin/calendar', icon: CalendarDays },
  { key: 'reservations', href: '/admin/reservations', icon: LayoutList },
  { key: 'units', href: '/admin/units', icon: House },
  { key: 'owners', href: '/admin/owners', icon: Users },
  { key: 'guests', href: '/admin/guests', icon: UserRound },
  { key: 'leads', href: '/admin/leads', icon: Inbox },
  { key: 'payouts', href: '/admin/payouts', icon: Banknote },
  { key: 'reports', href: '/admin/reports', icon: ChartColumn },
  { key: 'settings', href: '/admin/settings', icon: Settings },
];

const trim = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path);

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lang = useLang();
  const c = useCopy(common);
  const pathname = trim(usePathname());
  const { data, reset } = useDemo();
  const counts = useMemo(() => {
    if (!data) return {} as Partial<Record<NavKey, { n: number; bad?: boolean }>>;
    const clash = clashes(data).length;
    return {
      calendar: clash ? { n: clash, bad: true } : undefined,
      reservations: { n: needsDetails(data).length },
      leads: { n: data.leads.filter((l) => l.stage === 'new').length },
    } as Partial<Record<NavKey, { n: number; bad?: boolean }>>;
  }, [data]);

  return (
    <>
      {open ? <div className="sys-scrim" onClick={onClose} aria-hidden="true" /> : null}
      <nav className={`sys-side${open ? ' is-open' : ''}`} aria-label={c.system}>
        <Link href="/admin" className="sys-brand" onClick={onClose}>
          <EaMark />
          <span className="sys-brand__name">
            <b lang="en">Escape Away</b>
            <span>{c.system}</span>
          </span>
        </Link>
        <ul className="sys-nav">
          {items.map(({ key, href, icon: Icon }) => {
            const active = key === 'today' ? pathname === href : pathname.startsWith(href);
            const count = counts[key];
            return (
              <li key={key}>
                <Link href={href} className="sys-nav__link" aria-current={active ? 'page' : undefined} onClick={onClose}>
                  <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                  <span>{nav[key][lang]}</span>
                  {count && count.n ? <span className={`sys-nav__count${count.bad ? ' is-bad' : ''}`}>{count.n}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="sys-side__foot">
          <Link href="/staff" className="sys-nav__link" locale="ar" onClick={onClose}>
            <Smartphone size={18} strokeWidth={1.75} aria-hidden="true" />
            <span>{c.staffApp}</span>
          </Link>
          <Link href="/portal" className="sys-nav__link" onClick={onClose}>
            <KeyRound size={18} strokeWidth={1.75} aria-hidden="true" />
            <span>{c.ownerPortal}</span>
          </Link>
          <Link href="/" className="sys-nav__link" onClick={onClose}>
            <Globe size={18} strokeWidth={1.75} aria-hidden="true" />
            <span>{c.website}</span>
          </Link>
          <button type="button" className="sys-btn sys-btn--quiet sys-btn--small" onClick={reset}>
            <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />
            {c.reset}
          </button>
        </div>
      </nav>
    </>
  );
}

function SearchBox() {
  const lang = useLang();
  const c = useCopy(common);
  const { data, setPanel } = useDemo();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === '/' && !/input|textarea|select/i.test(target.tagName)) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!data || q.length < 2) return [];
    const guests = new Map(data.guests.map((g) => [g.id, g]));
    const digits = q.replace(/\D/g, '');
    return data.reservations
      .filter((r) => r.status !== 'cancelled')
      .filter((r) => {
        const g = r.guestId ? guests.get(r.guestId) : undefined;
        return (
          r.ref.toLowerCase().includes(q) ||
          r.unit.toLowerCase().includes(q) ||
          (g && g.name.toLowerCase().includes(q)) ||
          (digits.length >= 3 && g && g.phone.replace(/\D/g, '').includes(digits))
        );
      })
      .sort((a, b) => Math.abs(Date.parse(a.checkIn) - Date.parse(data.today)) - Math.abs(Date.parse(b.checkIn) - Date.parse(data.today)))
      .slice(0, 8)
      .map((r) => ({ r, g: r.guestId ? guests.get(r.guestId) : undefined }));
  }, [data, query]);

  return (
    <div className="sys-search" role="search">
      <Search size={17} strokeWidth={1.75} className="sys-search__icon" aria-hidden="true" />
      <input
        ref={input}
        className="sys-search__field"
        type="search"
        placeholder={c.search}
        aria-label={c.search}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setQuery('');
            setOpen(false);
          }
        }}
      />
      {!query ? <kbd className="sys-search__kbd" aria-hidden="true">/</kbd> : null}
      {open && query.trim().length >= 2 ? (
        <ul className="sys-search__results">
          {results.length ? (
            results.map(({ r, g }) => (
              <li key={r.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setPanel({ kind: 'reservation', id: r.id });
                    setOpen(false);
                  }}
                >
                  <b>{g ? <bdi>{g.name}</bdi> : c.needsDetails}</b>
                  <span className="sys-code sys-tiny">{r.ref}</span>
                  <span className="sub">
                    <span className="sys-code">{r.unit}</span> · {unitByCode[r.unit].name[lang]} · {stayRange(lang, r.checkIn, r.checkOut)}
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="sys-search__empty">{c.noResults}</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}

export function Loading() {
  const c = useCopy(common);
  return (
    <div className="sys-loading" aria-busy="true" aria-label={c.loading}>
      <div className="sys-skeleton" style={{ inlineSize: '14rem', blockSize: '2rem' }} />
      <div className="sys-skeleton" style={{ blockSize: '5.5rem' }} />
      <div className="sys-grid sys-grid--2">
        <div className="sys-skeleton" style={{ blockSize: '16rem' }} />
        <div className="sys-skeleton" style={{ blockSize: '16rem' }} />
      </div>
    </div>
  );
}

/** The system's frame: navy sidebar, slim top bar, the screen, and the side panel, toasts and tour. */
export function AdminShell({ children }: { children: ReactNode }) {
  const c = useCopy(common);
  const lang = useLang();
  const { data, tour, setTour, seenTour, setPanel } = useDemo();
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (/input|textarea|select/i.test(target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setPanel({ kind: 'new' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPanel]);

  // The first visit opens the guided demo once; after that it waits for the button.
  useEffect(() => {
    if (data && !seenTour) setTour({ open: true, step: 0 });
  }, [data, seenTour, setTour]);

  return (
    <div className="sys sys-frame">
      <Sidebar open={menu} onClose={() => setMenu(false)} />
      <div className="sys-main">
        <header className="sys-top">
          <button type="button" className="sys-btn sys-btn--quiet sys-btn--icon sys-top__menu" aria-label={c.menu} onClick={() => setMenu(true)}>
            <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <SearchBox />
          <div className="sys-top__end">
            <span className="sys-sample hide-narrow" title={c.sampleHint}>
              {c.sample}
            </span>
            <button
              type="button"
              className="sys-btn sys-btn--secondary sys-btn--small sys-top__tour"
              aria-label={c.tour}
              onClick={() => setTour({ ...tour, open: true, step: tour.open ? tour.step : 0 })}
            >
              <Compass size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>{c.tour}</span>
            </button>
            <LanguageSwitch text={lang === 'en' ? 'العربية' : 'English'} className="sys-btn sys-btn--quiet sys-btn--small" />
          </div>
        </header>
        <main id="main" className="sys-content" tabIndex={-1}>
          {data ? children : <Loading />}
        </main>
      </div>
      {data ? <PanelHost /> : null}
    </div>
  );
}
