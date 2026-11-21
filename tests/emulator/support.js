import { deleteApp } from 'firebase/app'
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { createFirebaseBackend, EMULATOR_CONFIG, initFirebase } from '@/backend/firebase'

const PROJECT_ID = EMULATOR_CONFIG.projectId

const openApps = []

/**
 * Signs in to the emulators as a (fake) Google user, each in its own Firebase app –
 * like separate browsers. Returns the user's id, the real backend and the raw Firestore.
 */
export async function signInAs(account) {
  const firebase = initFirebase(EMULATOR_CONFIG, {
    useEmulators: true,
    appName: `${account.id}-${Date.now()}`,
  })
  openApps.push(firebase.app)

  // The Auth emulator accepts an unsigned JSON "Google ID token".
  const idToken = JSON.stringify({
    sub: account.id,
    email: account.email,
    name: account.name,
    email_verified: true,
  })
  const { user } = await signInWithCredential(firebase.auth, GoogleAuthProvider.credential(idToken))

  const profile = { id: user.uid, name: account.name, email: account.email, photoURL: null }
  return { ...profile, profile, backend: createFirebaseBackend(firebase), db: firebase.db }
}

export async function resetEmulators() {
  await Promise.all(openApps.splice(0).map((app) => deleteApp(app)))
  await fetch(
    `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    {
      method: 'DELETE',
    },
  )
  await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT_ID}/accounts`, {
    method: 'DELETE',
  })
}

/** Subscribes and resolves with the first value that matches `predicate`. */
export function waitForValue(subscribe, predicate = () => true, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {}
    const timer = setTimeout(() => {
      unsubscribe()
      reject(new Error('Timed out waiting for a matching value'))
    }, timeoutMs)

    unsubscribe = subscribe((value) => {
      if (!predicate(value)) return
      clearTimeout(timer)
      queueMicrotask(() => unsubscribe())
      resolve(value)
    })
  })
}

export const PERMISSION_DENIED = { code: 'permission-denied' }
