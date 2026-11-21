// Tests the real Firebase backend and the security rules against the local emulators.
// Run with `npm run test:emulator` (it starts and stops the emulators for you).
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@tests': fileURLToPath(new URL('./tests', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/emulator/**/*.spec.js'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    fileParallelism: false, // the tests share one emulator
    restoreMocks: true,
  },
})
