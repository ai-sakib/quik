import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useBackend } from '@/backend'

// The user closed the Google popup themselves; that's not an error worth showing.
const CANCELLED_SIGN_IN_CODES = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request']

// Firebase error codes worth explaining. Most of them point to a setup step in the Firebase console.
const SIGN_IN_ERROR_MESSAGES = {
  'auth/configuration-not-found':
    'Google sign-in is not set up yet. In the Firebase console, open Authentication and enable the Google provider.',
  'auth/operation-not-allowed':
    'Google sign-in is turned off. In the Firebase console, enable the Google provider under Authentication → Sign-in method.',
  'auth/unauthorized-domain': `This website (${globalThis.location?.hostname}) is not allowed to sign in. Add it in the Firebase console under Authentication → Settings → Authorized domains.`,
  'auth/popup-blocked':
    'Your browser blocked the sign-in popup. Allow popups for this site and try again.',
  'auth/network-request-failed':
    'Could not reach Google. Check your internet connection and try again.',
}

export function describeSignInError(error) {
  return SIGN_IN_ERROR_MESSAGES[error?.code] ?? 'Sign-in failed. Please try again.'
}

export const useAuthStore = defineStore('auth', () => {
  const backend = useBackend()

  const user = ref(null)
  const isReady = ref(false)
  const isSigningIn = ref(false)
  const error = ref(null)
  let initialAuthState = null

  /** Starts listening to the sign-in state. Resolves once the initial state is known. */
  function init() {
    initialAuthState ??= new Promise((resolve) => {
      backend.auth.onChange((authUser) => {
        user.value = authUser
        isReady.value = true
        if (authUser) {
          backend.users
            .saveProfile(authUser)
            .catch((saveError) => console.error('[auth] could not save profile', saveError))
        }
        resolve()
      })
    })
    return initialAuthState
  }

  async function signInWithGoogle() {
    error.value = null
    isSigningIn.value = true
    try {
      await backend.auth.signInWithGoogle()
    } catch (signInError) {
      if (!CANCELLED_SIGN_IN_CODES.includes(signInError?.code)) {
        console.error('[auth] sign-in failed', signInError)
        error.value = describeSignInError(signInError)
      }
    } finally {
      isSigningIn.value = false
    }
  }

  function signOut() {
    return backend.auth.signOut()
  }

  return { user, isReady, isSigningIn, error, init, signInWithGoogle, signOut }
})
