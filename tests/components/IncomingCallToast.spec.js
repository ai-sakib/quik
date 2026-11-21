import { flushPromises } from '@vue/test-utils'
import { screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import IncomingCallToast from '@/components/call/IncomingCallToast.vue'
import { useCallStore } from '@/stores/call'
import { useConversationsStore } from '@/stores/conversations'
import { useUsersStore } from '@/stores/users'
import { ALICE, BOB, createFakeServer } from '@tests/support/fakeBackend'
import { renderWithStores } from '@tests/support/render'

/** Bob calls Alice; we look at Alice's screen. */
async function renderWithIncomingCall(kind = 'video') {
  const server = createFakeServer()
  ;[ALICE, BOB].forEach(server.saveUser)
  const bob = server.connect(BOB, { signedIn: true })
  const conversationId = await bob.conversations.openDirect('bob', 'alice')

  const result = await renderWithStores(IncomingCallToast, {
    backend: server.connect(ALICE, { signedIn: true }),
  })
  useUsersStore().start()
  useConversationsStore().start()
  await flushPromises()

  const conversation = server.db.conversations.get(conversationId)
  await bob.calls.start({ conversation, kind, startedBy: 'bob' })
  await flushPromises()
  return { ...result, server, conversationId }
}

describe('IncomingCallToast', () => {
  it('shows who is calling', async () => {
    await renderWithIncomingCall('audio')

    const toast = screen.getByRole('alertdialog', { name: 'Incoming call' })
    expect(toast).toHaveTextContent('Bob Brown')
    expect(toast).toHaveTextContent('Incoming voice call')
  })

  it('joins the call when accepted', async () => {
    const { user } = await renderWithIncomingCall()

    await user.click(screen.getByRole('button', { name: 'Accept call' }))
    await flushPromises()

    expect(useCallStore().status).toBe('connected')
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('ends a 1:1 call when declined', async () => {
    const { user, server, conversationId } = await renderWithIncomingCall()

    await user.click(screen.getByRole('button', { name: 'Decline call' }))
    await flushPromises()

    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(server.db.conversations.get(conversationId).activeCall).toBeNull()
  })
})
