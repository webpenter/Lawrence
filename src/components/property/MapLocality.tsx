'use client';

import { useEffect, useRef } from 'react';

import { horizonGradientFor } from '@/tokens/placeholders';
import { tokens } from '@/tokens/tokens';

export interface MapLocalityProps {
  /** Jittered/approved point from the projection — never the exact pin unless the seller permitted it. */
  lng: number;
  lat: number;
  approximate: boolean;
  label: string | null;
  panelLabel: string;
  unavailableNote: string;
}

/**
 * §11.3 — the locality map: a circle, never a pin. The point arriving here has
 * already been through the §8.3 projection (jittered for approximate_500m,
 * absent for locality_only — in which case this component is not rendered at
 * all). With a MapTiler key, MapLibre loads lazily and the circle is drawn as
 * a translucent geo-fixed fill; without one, the designed placeholder draws
 * the same circle over the horizon gradient.
 */
export function MapLocality({ lng, lat, approximate, label, panelLabel, unavailableNote }: MapLocalityProps) {
  const container = useRef<HTMLDivElement>(null);
  const rawKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const key = rawKey && !rawKey.startsWith('dev_') ? rawKey : undefined;

  useEffect(() => {
    if (!key || !container.current) return;
    let map: { remove: () => void } | null = null;
    let cancelled = false;

    void (async () => {
      const maplibre = await import('maplibre-gl');
      // @ts-expect-error css side-effect import has no types
      await import('maplibre-gl/dist/maplibre-gl.css');
      if (cancelled || !container.current) return;

      const instance = new maplibre.Map({
        container: container.current,
        style: `https://api.maptiler.com/maps/dataviz/style.json?key=${key}`,
        center: [lng, lat],
        zoom: approximate ? 12.5 : 14,
        interactive: false,
        attributionControl: { compact: true },
      });
      map = instance;

      instance.on('load', () => {
        // A geodesic-ish circle polygon (~600 m radius) — a shape on the map,
        // never a marker.
        const radiusM = approximate ? 600 : 250;
        const points = 64;
        const coords: [number, number][] = [];
        const mPerDegLat = 111_320;
        const mPerDegLng = mPerDegLat * Math.cos((lat * Math.PI) / 180);
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * 2 * Math.PI;
          coords.push([
            lng + (radiusM * Math.cos(angle)) / mPerDegLng,
            lat + (radiusM * Math.sin(angle)) / mPerDegLat,
          ]);
        }
        instance.addSource('locality-circle', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } },
        });
        instance.addLayer({
          id: 'locality-circle-fill',
          type: 'fill',
          source: 'locality-circle',
          paint: { 'fill-color': tokens.color.patina, 'fill-opacity': 0.18 },
        });
        instance.addLayer({
          id: 'locality-circle-line',
          type: 'line',
          source: 'locality-circle',
          paint: { 'line-color': tokens.color.patina, 'line-width': 1.5 },
        });
      });
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [key, lng, lat, approximate]);

  return (
    <section aria-label={panelLabel} className="mt-8">
      {label ? (
        <p className="mb-2 text-[length:var(--text-xs)] uppercase tracking-label text-graphite">
          {label}
        </p>
      ) : null}
      <div ref={container} className="relative aspect-[21/9] overflow-hidden border border-line bg-bone">
        {!key ? (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: horizonGradientFor('locality-map') }}
          >
            <span className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-patina bg-patina/15" />
          </div>
        ) : null}
        {!key ? <p className="sr-only">{unavailableNote}</p> : null}
      </div>
    </section>
  );
}
