import { screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { ALICE, createFakeServer } from '@tests/support/fakeBackend'
import { renderApp } from '@tests/support/render'

describe('Signing in and out', () => {
  it('sends signed-out visitors to the login page', async () => {
    const { router } = await renderApp({ backend: createFakeServer().connect(ALICE) })

    expect(router.currentRoute.value.name).toBe('login')
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument()
  })

  it('signs in with Google, shows the app, and signs out again', async () => {
    const server = createFakeServer()
    const { user, router } = await renderApp({ backend: server.connect(ALICE) })

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))

    expect(await screen.findByRole('heading', { name: 'Welcome, Alice!' })).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    expect(server.db.users.has('alice')).toBe(true) // others can now find Alice

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('button', { name: 'Continue with Google' })).toBeInTheDocument()
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('opens the originally requested page after signing in', async () => {
    const { user, router } = await renderApp({
      backend: createFakeServer().connect(ALICE),
      route: '/c/some-chat',
    })
    expect(router.currentRoute.value.query.redirect).toBe('/c/some-chat')

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))

    expect(await screen.findByText('Conversation not found')).toBeInTheDocument()
    expect(router.currentRoute.value.path).toBe('/c/some-chat')
  })

  it('skips the login page when already signed in', async () => {
    const { router } = await renderApp({
      backend: createFakeServer().connect(ALICE, { signedIn: true }),
      route: '/login',
    })

    expect(router.currentRoute.value.name).toBe('home')
  })
})
