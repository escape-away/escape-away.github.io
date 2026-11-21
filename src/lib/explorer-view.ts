'use client';

/**
 * A search from the hero lands on the map: on phones, where the explorer shows the list or the map,
 * the search bar asks the explorer to switch to the map before it scrolls there.
 */
const listeners = new Set<() => void>();

export function requestMapView() {
  listeners.forEach((l) => l());
}

export function onMapViewRequest(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
