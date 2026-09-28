export const tokens = {
  color: {
    obsidian: '#0A0B0D', // dark sections, headings
    ink: '#15171A', // body text
    graphite: '#4A4D52', // secondary text
    mist: '#9A9A94', // labels, tertiary
    bone: '#F3F0EA', // page surface
    vellum: '#FAF8F4', // raised surface
    line: 'rgba(10,11,13,0.10)',
    patina: '#7E6B4F', // the single warm accent, max 2% of surface
    patinaSoft: '#B9A888',
    focus: '#7E6B4F',
    success: '#3C6B52',
    warning: '#8A6A24',
    danger: '#8C3A2E',
  },
  font: {
    display: '"Canela","Cormorant Garamond",ui-serif,Georgia,serif',
    body: '"Inter",ui-sans-serif,system-ui,sans-serif',
    mono: 'ui-monospace,"SF Mono",monospace',
  },
  size: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.25rem',
    xl: '1.625rem',
    '2xl': '2.25rem',
    '3xl': '3rem',
    '4xl': '4.25rem',
    '5xl': '6rem',
  },
  tracking: { label: '0.14em', display: '-0.02em' },
  space: [0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192],
  radius: { none: '0', sm: '2px', md: '3px', lg: '6px' },
  shadow: { card: 'none', pop: '0 12px 48px rgba(10,11,13,.18)' },
  z: { map: 10, sticky: 20, header: 30, drawer: 40, modal: 50, toast: 60 },
  bp: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
  motion: { fast: '200ms', base: '320ms', slow: '420ms', ease: 'cubic-bezier(.22,.61,.36,1)' },
} as const;

export type Tokens = typeof tokens;
