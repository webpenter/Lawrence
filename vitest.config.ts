import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
        },
      },
      {
        // Each int file boots its own Payload + pg pool; running them in
        // parallel starves small dev machines and flakes on timeouts.
        extends: true,
        test: {
          name: 'int',
          include: ['tests/int/**/*.int.spec.ts'],
          fileParallelism: false,
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@payload-config': path.resolve(__dirname, './src/payload.config.ts'),
    },
  },
});
