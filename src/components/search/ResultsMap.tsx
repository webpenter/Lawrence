'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { layout } from '@/tokens/layout';

export interface MapMarker {
  id: string;
  label: string;
  lat: number;
  lng: number;
  approximate: boolean;
}

interface ResultsMapProps {
  markers: MapMarker[];
  panelLabel: string;
  unavailableNote: string;
}

function bounds(markers: MapMarker[]) {
  const lats = markers.map((m) => m.lat);
  const lngs = markers.map((m) => m.lng);
  const pad = 0.08;
  return {
    minLat: Math.min(...lats) - pad,
    maxLat: Math.max(...lats) + pad,
    minLng: Math.min(...lngs) - pad,
    maxLng: Math.max(...lngs) + pad,
  };
}

function highlightCard(id: string, on: boolean) {
  const card = document.querySelector(`[data-property-id="${id}"]`);
  if (card instanceof HTMLElement) {
    card.classList.toggle('outline', on);
    card.classList.toggle('outline-2', on);
    card.classList.toggle('outline-patina', on);
  }
}

/**
 * The sticky results map (§10.2). With NEXT_PUBLIC_MAPTILER_KEY set, MapLibre
 * loads lazily and search-as-I-move writes a debounced bbox to the URL; without
 * it (dev sandboxes, CI) the designed placeholder positions the same markers
 * proportionally — approximate listings render as circles, never pins (§6.6).
 */
export function ResultsMap({ markers, panelLabel, unavailableNote }: ResultsMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Placeholder keys (dev_*) mean "no key": render the designed fallback
  // instead of dialing MapTiler into a guaranteed 403 (same rule as the
  // brochure's staticMapUrl).
  const rawKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const key = rawKey && !rawKey.startsWith('dev_') ? rawKey : undefined;

  useEffect(() => {
    if (!key || !container.current || markers.length === 0) return;
    let map: { remove: () => void } | null = null;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    void (async () => {
      const maplibre = await import('maplibre-gl');
      // @ts-expect-error css module has no type declarations
      await import('maplibre-gl/dist/maplibre-gl.css');
      if (cancelled || !container.current) return;

      const b = bounds(markers);
      const instance = new maplibre.Map({
        container: container.current,
        style: `https://api.maptiler.com/maps/dataviz/style.json?key=${key}`,
        bounds: [b.minLng, b.minLat, b.maxLng, b.maxLat],
        fitBoundsOptions: { padding: 48 },
      });
      map = instance;

      for (const marker of markers) {
        const el = document.createElement('button');
        el.type = 'button';
        el.setAttribute('aria-label', marker.label);
        el.className = marker.approximate
          ? 'h-6 w-6 rounded-sm border border-patina bg-patina/20'
          : 'rounded-sm bg-vellum px-2 py-1 text-xs font-medium tabular-nums text-obsidian shadow-card';
        if (!marker.approximate) el.textContent = marker.label;
        el.addEventListener('mouseenter', () => highlightCard(marker.id, true));
        el.addEventListener('mouseleave', () => highlightCard(marker.id, false));
        new maplibre.Marker({ element: el }).setLngLat([marker.lng, marker.lat]).addTo(instance);
      }

      // Search as I move the map: 350 ms debounce writing bbox to the URL (§10.2).
      // Only user-driven moves count — the initial fitBounds also fires
      // moveend, and writing bbox on load would pollute every search URL.
      instance.on('moveend', (event: { originalEvent?: unknown }) => {
        if (!event.originalEvent) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          const mapBounds = instance.getBounds();
          const query = new URLSearchParams(searchParams.toString());
          query.set(
            'bbox',
            [
              mapBounds.getWest().toFixed(4),
              mapBounds.getSouth().toFixed(4),
              mapBounds.getEast().toFixed(4),
              mapBounds.getNorth().toFixed(4),
            ].join(','),
          );
          query.delete('page');
          router.replace(`${pathname}?${query.toString()}`, { scroll: false });
        }, 350);
      });
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      map?.remove();
    };
  }, [key, markers, pathname, router, searchParams]);

  if (key) {
    return <div ref={container} role="region" aria-label={panelLabel} className="h-full" style={{ minHeight: layout.searchSplitMinH }} />;
  }

  // Designed placeholder (no tiles): proportional marker layout like the preview.
  const b = markers.length > 0 ? bounds(markers) : null;
  return (
    <div
      role="region"
      aria-label={panelLabel}
      className="relative h-full overflow-hidden bg-patina-soft/25"
      style={{ minHeight: layout.searchSplitMinH }}
    >
      <p className="absolute inset-x-0 bottom-2 z-10 text-center text-[length:var(--text-xs)] text-graphite">
        {unavailableNote}
      </p>
      {b
        ? markers.map((marker) => {
            const left = ((marker.lng - b.minLng) / (b.maxLng - b.minLng)) * 100;
            const top = (1 - (marker.lat - b.minLat) / (b.maxLat - b.minLat)) * 100;
            return (
              <button
                key={marker.id}
                type="button"
                aria-label={marker.label}
                onMouseEnter={() => highlightCard(marker.id, true)}
                onMouseLeave={() => highlightCard(marker.id, false)}
                style={{ left: `${left}%`, top: `${top}%` }}
                className={
                  marker.approximate
                    ? 'absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-patina bg-patina/20'
                    : 'absolute -translate-x-1/2 -translate-y-full rounded-sm bg-vellum px-2 py-1 text-xs font-medium tabular-nums text-obsidian shadow-card'
                }
              >
                {marker.approximate ? null : marker.label}
              </button>
            );
          })
        : null}
    </div>
  );
}
