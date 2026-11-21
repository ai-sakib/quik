import { flushPromises } from '@vue/test-utils'
import { screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import ConversationHeader from '@/components/chat/ConversationHeader.vue'
import { useCallStore } from '@/stores/call'
import { useUsersStore } from '@/stores/users'
import { ALICE, BOB, CAROL, createFakeServer } from '@tests/support/fakeBackend'
import { renderWithStores } from '@tests/support/render'

async function renderHeader(conversation) {
  const server = createFakeServer()
  ;[ALICE, BOB, CAROL].forEach(server.saveUser)
  const result = await renderWithStores(ConversationHeader, {
    backend: server.connect(ALICE, { signedIn: true }),
    props: { conversation },
  })
  useUsersStore().start()
  await flushPromises()
  return { ...result, server, call: useCallStore() }
}

const direct = { id: 'direct_alice_bob', type: 'direct', memberIds: ['alice', 'bob'] }

describe('ConversationHeader', () => {
  it('shows the other person in a 1:1 chat', async () => {
    await renderHeader(direct)

    expect(screen.getByRole('heading', { name: 'Bob Brown' })).toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
  })

  it('shows the group name and members in a group', async () => {
    await renderHeader({
      id: 'g1',
      type: 'group',
      name: 'Team',
      memberIds: ['alice', 'bob', 'carol'],
    })

    expect(screen.getByRole('heading', { name: 'Team' })).toBeInTheDocument()
    expect(screen.getByText('You, Bob, Carol')).toBeInTheDocument()
  })

  it('starts voice and video calls', async () => {
    const { user, server } = await renderHeader(direct)
    server.db.conversations.set(direct.id, { ...direct, activeCall: null })

    await user.click(screen.getByRole('button', { name: 'Start video call' }))
    await flushPromises()

    expect([...server.db.calls.values()]).toEqual([
      expect.objectContaining({ conversationId: direct.id, kind: 'video', startedBy: 'alice' }),
    ])
  })

  it('offers to join a call that is already running', async () => {
    const activeCall = { id: 'call-1', kind: 'audio', startedBy: 'bob', startedAt: Date.now() }
    await renderHeader({ ...direct, activeCall })

    expect(screen.getByRole('button', { name: 'Join call' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start video call' })).toBeNull()
  })
})
