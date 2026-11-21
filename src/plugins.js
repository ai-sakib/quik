import { createPinia } from 'pinia'
import { createBackendPlugin } from '@/backend'
import { createAppRouter } from '@/router'

/**
 * Everything the app needs, as Vue plugins.
 * Used by main.js (with Firebase) and by the integration tests (with a fake backend).
 */
export function createAppPlugins({ backend, history }) {
  const router = createAppRouter(history)
  return {
    router,
    plugins: [createBackendPlugin(backend), createPinia(), router],
  }
}
