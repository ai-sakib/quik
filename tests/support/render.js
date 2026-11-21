import { flushPromises } from '@vue/test-utils'
import userEvent from '@testing-library/user-event'
import { render } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import { createApp, defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '@/App.vue'
import { createBackendPlugin } from '@/backend'
import { createAppPlugins } from '@/plugins'
import { useAuthStore } from '@/stores/auth'

/**
 * Integration tests: renders the whole app – real router, stores, views and
 * components – on top of a fake backend. `route` is the URL the user opens.
 */
export async function renderApp({ backend, route = '/' }) {
  const history = createMemoryHistory()
  history.replace(route)
  const { router, plugins } = createAppPlugins({ backend, history })

  const result = render(App, { global: { plugins } })
  await router.isReady()
  await flushPromises()
  return { ...result, router, user: userEvent.setup() }
}

const Empty = defineComponent({ render: () => null })
const TEST_ROUTES = [
  { path: '/', name: 'home', component: Empty },
  { path: '/login', name: 'login', component: Empty },
  { path: '/c/:conversationId', name: 'conversation', component: Empty },
]

/**
 * Component tests: renders one component with stores, a router and a fake backend.
 * Like the real app, it waits until the sign-in state is known before rendering.
 */
export async function renderWithStores(component, { backend, props = {} } = {}) {
  const router = createRouter({ history: createMemoryHistory(), routes: TEST_ROUTES })

  const AfterSignIn = defineComponent(() => {
    const auth = useAuthStore()
    auth.init()
    return () => (auth.isReady ? h(component, props) : null)
  })

  const result = render(AfterSignIn, {
    global: { plugins: [createBackendPlugin(backend), createPinia(), router] },
  })
  await router.isReady()
  await flushPromises()
  return { ...result, router, user: userEvent.setup() }
}

/**
 * Store tests: an app-less Pinia that can still inject the backend.
 * Each call creates an independent "browser", so several users can be simulated.
 */
export function createStoreContext(backend) {
  const app = createApp({})
  const pinia = createPinia()
  app.use(createBackendPlugin(backend)).use(pinia)
  setActivePinia(pinia)
  return pinia
}
