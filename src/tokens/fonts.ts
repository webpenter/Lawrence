import localFont from 'next/font/local';

// §10.3: fonts are self-hosted, subset, max four files. Both families ship as
// single variable-weight latin woff2 subsets (Cormorant Garamond 300–700,
// Inter 100–900); the cyrillic subsets join with the §13.9 translation pass.
// Self-hosting also keeps the build offline — no Google Fonts fetch at build
// time. A paid Canela licence later is a one-line swap here (§13.3).

export const displayFont = localFont({
  src: './fonts/cormorant-garamond-latin.woff2',
  weight: '300 700',
  variable: '--font-display-loaded',
  display: 'swap',
  preload: true,
});

export const bodyFont = localFont({
  src: './fonts/inter-latin.woff2',
  weight: '100 900',
  variable: '--font-body-loaded',
  display: 'swap',
  preload: false,
});
