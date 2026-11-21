import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@tests': fileURLToPath(new URL('./tests', import.meta.url)),
    },
  },
  build: {
    // The Firebase SDK (Auth + Firestore) alone is ~575 kB minified / ~170 kB gzipped.
    chunkSizeWarningLimit: 650,
    rolldownOptions: {
      output: {
        // Keep big libraries in their own cached chunks, separate from the app code.
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/]@?firebase/ },
            { name: 'vendor', test: /node_modules/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/{unit,components,integration}/**/*.spec.js'],
    restoreMocks: true,
  },
})
