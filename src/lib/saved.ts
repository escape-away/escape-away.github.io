'use client';

import { useSyncExternalStore } from 'react';

/**
 * The stays a visitor saved with a heart. They stay on this device (localStorage): no account, and
 * nothing is sent anywhere. Every heart and the explorer's Saved chip read this one list, and a heart
 * tapped in another tab shows here too. Where storage is blocked (some private windows), the list
 * lasts the visit.
 */
const KEY = 'ea-saved';
const MAX = 200;
const none: readonly string[] = [];

const listeners = new Set<() => void>();
let cache: { raw: string | null; value: readonly string[] } = { raw: null, value: none };
/** Used once a write has failed: the list then lives in memory for the rest of the visit. */
let memory: readonly string[] | null = null;

function parse(raw: string | null): readonly string[] {
  if (!raw) return none;
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').slice(0, MAX) : none;
  } catch {
    return none;
  }
}

function snapshot(): readonly string[] {
  if (memory) return memory;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return cache.value;
  }
  if (raw !== cache.raw) cache = { raw, value: parse(raw) };
  return cache.value;
}

function write(next: readonly string[]) {
  try {
    const raw = JSON.stringify(next);
    window.localStorage.setItem(KEY, raw);
    cache = { raw, value: next };
    memory = null;
  } catch {
    memory = next;
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** The saved stays' slugs, oldest first. Empty in the built page; filled in once the page runs. */
export function useSaved(): readonly string[] {
  return useSyncExternalStore(subscribe, snapshot, () => none);
}

export function toggleSaved(slug: string) {
  const current = snapshot();
  write(current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug].slice(-MAX));
}
