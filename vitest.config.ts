import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 10000,
    setupFiles: [],
    include: ['src/**/*.test.ts'],
    exclude: ['lib/**/*', 'node_modules/**/*'],
  },
})
