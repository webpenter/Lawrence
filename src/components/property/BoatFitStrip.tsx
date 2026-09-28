'use client';

import { useState } from 'react';

import { BOAT_BUCKETS, bucketFor } from '@/lib/boat-buckets';

interface BoatFitStripProps {
  title: string;
  sub: string;
  lengthLabel: string;
  /** Rendered right of the slider, e.g. "Draft 2.5 m" (preview .scale row). */
  draftLabel: string;
  searchCta: string;
  /** Count of properties whose berth takes each bucket's LOA (precomputed at build, §10.1). */
  bucketCounts: Record<number, number>;
  /** Raw §11.1 template: "{count} properties take a {loa} m boat." */
  resultTemplate: string;
  locale: string;
}

/**
 * The brand moment (§10.1 block 5): a boat-length slider over precomputed
 * bucket counts so the number moves instantly, with a link into search
 * carrying the chosen length. Abyss panel, sand accent, per the preview.
 */
export function BoatFitStrip({
  title,
  sub,
  lengthLabel,
  draftLabel,
  searchCta,
  bucketCounts,
  resultTemplate,
  locale,
}: BoatFitStripProps) {
  const [loa, setLoa] = useState(24);
  const count = bucketCounts[bucketFor(loa)] ?? 0;

  const [before, afterCount] = resultTemplate.split('{count}');
  const [middle, afterLoa] = (afterCount ?? '').split('{loa}');

  return (
    <section className="grid gap-8 bg-obsidian px-7 py-8 text-vellum md:grid-cols-[1fr_1.2fr] md:items-center">
      <div>
        {/* Preview .boatstrip h2: 26px — --text-xl. */}
        <h2 className="mb-2 font-display text-xl">{title}</h2>
        <p className="max-w-[38ch] text-sm text-vellum/70">{sub}</p>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-[length:var(--text-xs)] tabular-nums text-vellum/50">
          {BOAT_BUCKETS.map((bucket) => (
            <span key={bucket}>{bucket} m</span>
          ))}
        </div>
        <input
          type="range"
          min={8}
          max={60}
          step={1}
          value={loa}
          onChange={(event) => setLoa(Number(event.target.value))}
          aria-label={lengthLabel}
          className="w-full accent-patina-soft"
        />
        <div className="mt-1 flex justify-between text-[length:var(--text-xs)] tabular-nums">
          <span className="text-patina-soft">
            {lengthLabel} · {loa} m
          </span>
          <span className="text-vellum/50">{draftLabel}</span>
        </div>
        {/* Preview .result: 30px — --text-2xl. */}
        <p aria-live="polite" className="mt-3 font-display text-2xl">
          {before}
          <em className="not-italic text-patina-soft tabular-nums">
            {new Intl.NumberFormat(locale).format(count)}
          </em>
          {middle}
          <span className="tabular-nums">{loa}</span>
          {afterLoa}
        </p>
        <a
          href={`/${locale}/search?boatLoa=${loa}`}
          className="mt-3 inline-block border border-patina-soft px-4 py-2 text-xs uppercase tracking-[0.14em] text-patina-soft hover:bg-patina-soft hover:text-obsidian"
        >
          {searchCta}
        </a>
      </div>
    </section>
  );
}
