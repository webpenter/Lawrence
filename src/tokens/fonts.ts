import { Cormorant_Garamond, Inter } from 'next/font/google';

export const displayFont = Cormorant_Garamond({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display-loaded',
  display: 'swap',
  preload: true,
});

export const bodyFont = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-body-loaded',
  display: 'swap',
  preload: false,
});
