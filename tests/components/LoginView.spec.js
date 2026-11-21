import { screen } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'
import LoginView from '@/views/LoginView.vue'
import { ALICE, createFakeServer } from '@tests/support/fakeBackend'
import { renderWithStores } from '@tests/support/render'

function renderLogin(options) {
  const backend = createFakeServer().connect(ALICE, options)
  return renderWithStores(LoginView, { backend })
}

describe('LoginView', () => {
  it('offers Google as the only way to sign in', async () => {
    await renderLogin()

    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument()
  })

  it('goes to the app after signing in', async () => {
    const { user, router } = await renderLogin()

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))

    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/'))
  })

  it('returns to the page the user originally wanted', async () => {
    const { user, router } = await renderLogin()
    await router.push({ name: 'login', query: { redirect: '/c/some-chat' } })

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))

    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/c/some-chat'))
  })

  it('shows an error when sign-in fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { user } = await renderLogin({ signInError: new Error('network down') })

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/sign-in failed/i)
  })
})
