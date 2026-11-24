'use client';

/**
 * The demo's memory. The records are rebuilt from today's date on every visit, and what the visitor
 * does (a booking added, a clash fixed, a task done) is kept as a short list of actions in this tab's
 * session storage and replayed on top, so a reload or a switch to Arabic keeps the story where it was.
 * Nothing leaves the browser.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cairoToday } from './dates';
import { buildDemo } from './seed';
import type { Block, DemoData, Guest, L10n, LeadStage, Payout, Reservation, Task, TeamAlert } from './types';

export type Action =
  | { type: 'guest/add'; guest: Guest }
  | { type: 'reservation/add'; reservation: Reservation }
  | { type: 'reservation/update'; id: string; patch: Partial<Reservation> }
  | { type: 'task/add'; task: Task }
  | { type: 'task/update'; id: string; patch: Partial<Task> }
  | { type: 'lead/stage'; id: string; stage: LeadStage }
  | { type: 'block/add'; block: Block }
  | { type: 'feeds/sync'; at: string }
  | { type: 'alert/add'; alert: TeamAlert }
  | { type: 'payout/status'; ownerId: string; month: string; status: Payout['status'] };

function apply(data: DemoData, action: Action): DemoData {
  switch (action.type) {
    case 'guest/add':
      return { ...data, guests: [...data.guests.filter((g) => g.id !== action.guest.id), action.guest] };
    case 'reservation/add':
      return { ...data, reservations: [...data.reservations.filter((r) => r.id !== action.reservation.id), action.reservation] };
    case 'reservation/update':
      return { ...data, reservations: data.reservations.map((r) => (r.id === action.id ? { ...r, ...action.patch } : r)) };
    case 'task/add':
      return { ...data, tasks: [...data.tasks.filter((t) => t.id !== action.task.id), action.task] };
    case 'task/update':
      return { ...data, tasks: data.tasks.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)) };
    case 'lead/stage':
      return { ...data, leads: data.leads.map((l) => (l.id === action.id ? { ...l, stage: action.stage } : l)) };
    case 'block/add':
      return { ...data, blocks: [...data.blocks.filter((b) => b.id !== action.block.id), action.block] };
    case 'feeds/sync':
      return { ...data, feeds: data.feeds.map((f) => (f.ok ? { ...f, lastSync: action.at } : f)) };
    case 'alert/add':
      return { ...data, alerts: [action.alert, ...data.alerts.filter((a) => a.id !== action.alert.id)] };
    case 'payout/status':
      return {
        ...data,
        payouts: data.payouts.map((p) => (p.ownerId === action.ownerId && p.month === action.month ? { ...p, status: action.status } : p)),
      };
    default:
      return data;
  }
}

export type Panel =
  | { kind: 'reservation'; id: string }
  | { kind: 'unit'; code: string }
  | { kind: 'new'; unit?: string; checkIn?: string }
  | null;

export type Toast = { id: number; text: L10n; tone: 'info' | 'success' | 'warning' | 'error' };
/** `lang` is the language the tour started in; it returns there after the Arabic housekeeping step. */
export type TourState = { open: boolean; step: number; lang?: 'en' | 'ar' };

type Saved = { v: 1; today: string; startedAt: string; actions: Action[]; tour: TourState; seenTour: boolean };

const KEY = 'ea-system-demo';

function load(today: string): Saved | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    return saved.v === 1 && saved.today === today ? saved : null;
  } catch {
    return null;
  }
}

function store(saved: Saved) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    /* storage blocked: the demo still runs, it just forgets on reload */
  }
}

type Ctx = {
  data: DemoData | null;
  dispatch: (...actions: Action[]) => void;
  reset: () => void;
  panel: Panel;
  setPanel: (panel: Panel) => void;
  toasts: Toast[];
  toast: (text: L10n, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
  tour: TourState;
  setTour: (tour: TourState) => void;
  seenTour: boolean;
  /** A booking to point at on the next screen (the calendar scrolls to it and rings it). */
  focus: string | null;
  setFocus: (id: string | null) => void;
};

const DemoContext = createContext<Ctx | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DemoData | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [tour, setTourState] = useState<TourState>({ open: false, step: 0 });
  const [seenTour, setSeenTour] = useState(true);
  const [focus, setFocus] = useState<string | null>(null);
  const saved = useRef<Saved | null>(null);
  const toastId = useRef(0);

  const boot = useCallback((fresh: boolean) => {
    const today = cairoToday();
    const previous = fresh ? null : load(today);
    const record: Saved = previous ?? {
      v: 1,
      today,
      startedAt: new Date().toISOString(),
      actions: [],
      tour: { open: false, step: 0 },
      seenTour: false,
    };
    // A link with ?tour=off (for sharing a screen, or a review capture) skips the opening tour.
    if (new URLSearchParams(window.location.search).get('tour') === 'off') {
      record.seenTour = true;
      record.tour = { ...record.tour, open: false };
    }
    saved.current = record;
    store(record);
    const base = buildDemo(today, new Date(record.startedAt));
    setData(record.actions.reduce(apply, base));
    setTourState(record.tour);
    setSeenTour(record.seenTour);
  }, []);

  // Built in the browser after the first paint: the data depends on today's date, which a static page
  // can't know when it is exported.
  useEffect(() => boot(false), [boot]);

  const dispatch = useCallback((...actions: Action[]) => {
    if (!saved.current) return;
    saved.current = { ...saved.current, actions: [...saved.current.actions, ...actions] };
    store(saved.current);
    setData((current) => (current ? actions.reduce(apply, current) : current));
  }, []);

  const setTour = useCallback((next: TourState) => {
    setTourState(next);
    setSeenTour(true);
    if (saved.current) {
      saved.current = { ...saved.current, tour: next, seenTour: true };
      store(saved.current);
    }
  }, []);

  const toast = useCallback((text: L10n, tone: Toast['tone'] = 'info') => {
    toastId.current += 1;
    const id = toastId.current;
    setToasts((list) => [...list.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 5200);
  }, []);

  const dismissToast = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* nothing stored */
    }
    setPanel(null);
    setFocus(null);
    boot(true);
    window.scrollTo({ top: 0 });
  }, [boot]);

  const value = useMemo(
    () => ({ data, dispatch, reset, panel, setPanel, toasts, toast, dismissToast, tour, setTour, seenTour, focus, setFocus }),
    [data, dispatch, reset, panel, toasts, toast, dismissToast, tour, setTour, seenTour, focus],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo needs the DemoProvider from the system layout');
  return ctx;
}

/** For screens that render only once the data exists (the shell shows the loading state before). */
export function useData() {
  const { data } = useDemo();
  if (!data) throw new Error('useData before the demo data is ready');
  return data;
}

/** The current time, ticking each half minute, for "synced 4 min ago" lines. */
export function useNow(interval = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [interval]);
  return now;
}
