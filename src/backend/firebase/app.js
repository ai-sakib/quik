import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore'

/** Used with the local emulators (`npm run emulators`). "demo-" projects need no real Firebase project. */
export const EMULATOR_CONFIG = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-quik.firebaseapp.com',
  projectId: 'demo-quik',
  appId: 'demo-app-id',
}

export function readFirebaseConfig(env = import.meta.env) {
  if (env.VITE_USE_FIREBASE_EMULATORS === 'true') return EMULATOR_CONFIG

  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  }
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(`Missing Firebase config: ${missing.join(', ')}. See .env.example.`)
  }
  return config
}

/**
 * @param {object} config Firebase web config
 * @param {{ useEmulators?: boolean, appName?: string }} options
 *   useEmulators: connect to the local Firebase emulators (see firebase.json)
 *   appName: only needed to run several signed-in users side by side (emulator tests)
 */
export function initFirebase(config, { useEmulators = false, appName } = {}) {
  const app = initializeApp(config, appName)
  const auth = getAuth(app)
  // ICE candidates can contain undefined fields, which Firestore would otherwise reject.
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true })

  if (useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
  }
  return { app, auth, db }
}
