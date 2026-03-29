import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { app: new URL('./src', import.meta.url).pathname },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
