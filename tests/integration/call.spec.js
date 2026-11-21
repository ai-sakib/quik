import { within } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'
import { ALICE, BOB, createFakeServer } from '@tests/support/fakeBackend'
import { permissionDeniedError } from '@tests/support/fakeWebRTC'
import { renderApp } from '@tests/support/render'

/** Alice and Bob both have the app open; Alice is looking at their 1:1 chat. */
async function setup() {
  const server = createFakeServer()
  ;[ALICE, BOB].forEach(server.saveUser)
  const conversationId = await server.connect(ALICE).conversations.openDirect('alice', 'bob')

  const open = async (account, route) => {
    const app = await renderApp({ backend: server.connect(account, { signedIn: true }), route })
    return { ...app, screen: within(app.container) }
  }
  const alice = await open(ALICE, `/c/${conversationId}`)
  const bob = await open(BOB, '/')
  await alice.screen.findByRole('heading', { name: 'Bob Brown' })
  return { server, conversationId, alice, bob }
}

describe('Calling', () => {
  it('Alice video-calls Bob, Bob answers, then Alice hangs up', async () => {
    const { server, conversationId, alice, bob } = await setup()

    // Alice calls
    await alice.user.click(alice.screen.getByRole('button', { name: 'Start video call' }))
    const alicesCall = await alice.screen.findByRole('dialog', { name: 'Call with Bob Brown' })
    expect(await within(alicesCall).findByText('Waiting for others to join…')).toBeInTheDocument()

    // Bob's phone rings
    const ringing = await bob.screen.findByRole('alertdialog', { name: 'Incoming call' })
    expect(ringing).toHaveTextContent('Alice Anderson')
    expect(ringing).toHaveTextContent('Incoming video call')
    await bob.user.click(within(ringing).getByRole('button', { name: 'Accept call' }))

    // They see each other
    const bobsCall = await bob.screen.findByRole('dialog', { name: 'Call with Alice Anderson' })
    expect(
      await within(bobsCall).findByRole('figure', { name: 'Alice Anderson' }),
    ).toBeInTheDocument()
    expect(await within(alicesCall).findByRole('figure', { name: 'Bob Brown' })).toBeInTheDocument()
    expect(within(alicesCall).getByRole('figure', { name: 'You' })).toBeInTheDocument()

    // Alice mutes, then hangs up – the call ends for both
    await alice.user.click(within(alicesCall).getByRole('button', { name: 'Mute microphone' }))
    expect(
      within(alicesCall).getByRole('button', { name: 'Unmute microphone' }),
    ).toBeInTheDocument()
    await alice.user.click(within(alicesCall).getByRole('button', { name: 'Leave call' }))

    await vi.waitFor(() => {
      expect(alice.screen.queryByRole('dialog')).toBeNull()
      expect(bob.screen.queryByRole('dialog')).toBeNull()
    })
    expect(server.db.conversations.get(conversationId).activeCall).toBeNull()
  })

  it('shows "Call in progress" and a Join button to members who are not in the call', async () => {
    const { alice, bob } = await setup()

    await alice.user.click(alice.screen.getByRole('button', { name: 'Start voice call' }))
    const bobsChat = await bob.screen.findByRole('link', { name: /Alice Anderson/ })
    expect(await within(bobsChat).findByText('Call in progress')).toBeInTheDocument()

    // Bob ignores the ringing, opens the chat later and joins from there
    await bob.user.click(bobsChat)
    await bob.user.click(await bob.screen.findByRole('button', { name: 'Join call' }))

    const bobsCall = await bob.screen.findByRole('dialog', { name: 'Call with Alice Anderson' })
    expect(within(bobsCall).getByText('Voice call')).toBeInTheDocument()
    expect(within(bobsCall).queryByRole('button', { name: /camera/ })).toBeNull()
  })

  it('explains the problem when camera access is denied', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { server, alice } = await setup()
    navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(permissionDeniedError())

    await alice.user.click(alice.screen.getByRole('button', { name: 'Start video call' }))

    expect(await alice.screen.findByRole('alert')).toHaveTextContent(/permission/i)
    expect(alice.screen.queryByRole('dialog')).toBeNull()
    expect(server.db.calls.size).toBe(0) // Bob is never rung
  })
})
