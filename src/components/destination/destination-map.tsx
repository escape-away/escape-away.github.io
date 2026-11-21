'use client';

import { useState } from 'react';
import type { ExplorerItem } from '@/lib/explorer';
import { StaysMap } from '../explorer/stays-map';
import type { LngLat } from '../explorer/map-engine';

/**
 * A destination's stays on the explorer's map, framed on the whole area: the same pins, clusters,
 * card and zoom buttons, without the search and filters around them. The cards under the map are
 * the same stays, so nothing here is only reachable by dragging.
 */
export function DestinationMap({ items, center, zoom }: { items: ExplorerItem[]; center: LngLat; zoom: number }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="area-map">
      <StaysMap
        items={items}
        fitKey="area"
        area={{ center, zoom }}
        selected={selected}
        linked={null}
        onSelect={setSelected}
        onHover={() => {}}
        fitZoom={zoom}
      />
    </div>
  );
}
