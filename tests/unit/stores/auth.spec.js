import { flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { useAuthStore } from '@/stores/auth'
import { ALICE, createFakeServer } from '@tests/support/fakeBackend'
import { createStoreContext } from '@tests/support/render'

function setup(options) {
  const server = createFakeServer()
  createStoreContext(server.connect(ALICE, options))
  return { server, auth: useAuthStore() }
}

describe('auth store', () => {
  it('knows the initial sign-in state after init()', async () => {
    const { auth } = setup({ signedIn: true })
    expect(auth.isReady).toBe(false)

    await auth.init()

    expect(auth.isReady).toBe(true)
    expect(auth.user).toEqual(ALICE)
  })

  it('signs in with Google and saves the profile so others can find the user', async () => {
    const { auth, server } = setup()
    await auth.init()
    expect(auth.user).toBeNull()

    await auth.signInWithGoogle()
    await flushPromises()

    expect(auth.user).toEqual(ALICE)
    expect(server.db.users.get('alice')).toMatchObject({ name: 'Alice Anderson' })
  })

  it('shows no error when the user closes the Google popup', async () => {
    const signInError = Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' })
    const { auth } = setup({ signInError })
    await auth.init()

    await auth.signInWithGoogle()

    expect(auth.error).toBeNull()
    expect(auth.isSigningIn).toBe(false)
  })

  it('shows an error when sign-in fails', async () => {
    const signInError = Object.assign(new Error('boom'), { code: 'auth/internal-error' })
    const { auth } = setup({ signInError })
    await auth.init()

    await auth.signInWithGoogle()

    expect(auth.error).toMatch(/sign-in failed/i)
  })

  it.each([
    ['auth/configuration-not-found', /enable the Google provider/],
    ['auth/operation-not-allowed', /enable the Google provider/],
    ['auth/unauthorized-domain', /Authorized domains/],
    ['auth/popup-blocked', /allow popups/i],
    ['auth/network-request-failed', /internet connection/],
  ])('explains %s, so setup problems are easy to fix', async (code, message) => {
    const { auth } = setup({ signInError: Object.assign(new Error(code), { code }) })
    await auth.init()

    await auth.signInWithGoogle()

    expect(auth.error).toMatch(message)
  })

  it('signs out', async () => {
    const { auth } = setup({ signedIn: true })
    await auth.init()

    await auth.signOut()

    expect(auth.user).toBeNull()
  })
})
