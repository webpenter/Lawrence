'use client';

import dynamic from 'next/dynamic';

import { layout } from '@/tokens/layout';

import type { MapMarker } from './ResultsMap';

// The map never enters the initial bundle (§10.2 performance rule): the whole
// ResultsMap chunk — MapLibre included — loads client-side on demand.
const ResultsMap = dynamic(() => import('./ResultsMap').then((m) => m.ResultsMap), {
  ssr: false,
  loading: () => (
    <div className="h-full animate-pulse bg-patina-soft/20" style={{ minHeight: layout.searchSplitMinH }} />
  ),
});

interface MapPanelProps {
  markers: MapMarker[];
  panelLabel: string;
  unavailableNote: string;
}

export function MapPanel(props: MapPanelProps) {
  return <ResultsMap {...props} />;
}
