import './assets/main.css'
import { createApp } from 'vue'
import { createWebHistory } from 'vue-router'
import App from './App.vue'
import { createFirebaseBackend, initFirebase, readFirebaseConfig } from './backend/firebase'
import { createAppPlugins } from './plugins'

function start() {
  const firebase = initFirebase(readFirebaseConfig(), {
    useEmulators: import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true',
  })
  const { plugins } = createAppPlugins({
    backend: createFirebaseBackend(firebase),
    history: createWebHistory(),
  })

  const app = createApp(App)
  plugins.forEach((plugin) => app.use(plugin))
  app.mount('#app')
}

try {
  start()
} catch (error) {
  // Most likely the Firebase env variables are missing – show that instead of a blank page.
  console.error(error)
  const message = document.createElement('p')
  message.className = 'p-8 text-center font-mono text-sm text-rose-700'
  message.textContent = error.message
  document.getElementById('app').replaceChildren(message)
}
