import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    globals: false,
    env: {
      // Tests exercise billing/trial/credit logic which requires cloud mode.
      // Self-hosted mode bypasses all billing — nothing meaningful to test.
      NEXT_PUBLIC_SPECTACL_MODE: 'cloud',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      // Only measure coverage on actual source code under src/.
      // Excludes compiled output (build/, .next/, worker-build/), Prisma
      // generated client/migrations/seeds, config files, test files,
      // shared test mocks, and visual email templates.
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'build/**',
        'worker-build/**',
        '.next/**',
        'node_modules/**',
        'coverage/**',
        'dist/**',
        'prisma/**',
        'scripts/**',
        'docs/**',
        '**/*.config.{ts,js,mjs,cjs}',
        '**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/emails/**',
        'src/generated/**',
      ],
    },
  },
});
