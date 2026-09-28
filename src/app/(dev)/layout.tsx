import type { Metadata } from 'next';
import React from 'react';

import { bodyFont, displayFont } from '@/tokens/fonts';

import '../(frontend)/styles.css';

export const metadata: Metadata = {
  title: 'Lawrence dev',
  robots: { index: false, follow: false },
};

// Root layout for dev-only routes (/dev/styleguide). English-only, unindexed,
// outside the locale tree on purpose.
export default function DevLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
