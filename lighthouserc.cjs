module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm start',
      startServerReadyPattern: 'Ready in',
      startServerReadyTimeout: 30000,
      // Prompt 16/17 acceptance: Lighthouse assertions across key routes
      url: [
        'http://localhost:3000/en',
        'http://localhost:3000/en/collection',
        'http://localhost:3000/en/property/sample-lpc-sample-001',
      ],
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        // §12.1 Hard budget failures
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 1 }],
        // §12.1 / CLAUDE.md rule 1: LCP < 1.2 s mobile — never weakened.
        'largest-contentful-paint': ['error', { maxNumericValue: 1200 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
        'total-byte-weight': ['error', { maxNumericValue: 300000 }],
        'dom-size': ['error', { maxNumericValue: 800 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
