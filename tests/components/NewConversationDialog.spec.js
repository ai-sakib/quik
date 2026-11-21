import { screen } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'
import NewConversationDialog from '@/components/conversations/NewConversationDialog.vue'
import { useUsersStore } from '@/stores/users'
import { ALICE, BOB, CAROL, createFakeServer } from '@tests/support/fakeBackend'
import { renderWithStores } from '@tests/support/render'
import { flushPromises } from '@vue/test-utils'

async function renderDialog() {
  const server = createFakeServer()
  ;[ALICE, BOB, CAROL].forEach(server.saveUser)
  const onClose = vi.fn()
  const result = await renderWithStores(NewConversationDialog, {
    backend: server.connect(ALICE, { signedIn: true }),
    props: { onClose },
  })
  useUsersStore().start()
  await flushPromises()
  return { ...result, server, onClose }
}

const personCheckbox = (name) => screen.getByRole('checkbox', { name: new RegExp(name) })

describe('NewConversationDialog', () => {
  it('lists everyone except me', async () => {
    await renderDialog()

    expect(personCheckbox('Bob Brown')).toBeInTheDocument()
    expect(personCheckbox('Carol Clark')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /Alice/ })).toBeNull()
  })

  it('filters people by name or email', async () => {
    const { user } = await renderDialog()

    await user.type(screen.getByPlaceholderText('Search people'), 'carol@')

    expect(screen.queryByRole('checkbox', { name: /Bob/ })).toBeNull()
    expect(personCheckbox('Carol Clark')).toBeInTheDocument()
  })

  it('starts a 1:1 chat when one person is picked', async () => {
    const { user, router, onClose } = await renderDialog()

    await user.click(personCheckbox('Bob Brown'))
    await user.click(screen.getByRole('button', { name: 'Start chat' }))

    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/c/direct_alice_bob'))
    expect(onClose).toHaveBeenCalled()
  })

  it('creates a named group when several people are picked', async () => {
    const { user, server, router } = await renderDialog()

    await user.click(personCheckbox('Bob Brown'))
    await user.click(personCheckbox('Carol Clark'))
    const createButton = screen.getByRole('button', { name: /Create group \(3 people\)/ })
    expect(createButton).toBeDisabled() // needs a name first

    await user.type(screen.getByLabelText('Group name'), 'Weekend plans')
    await user.click(createButton)

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('conversation'))
    const group = server.db.conversations.get(router.currentRoute.value.params.conversationId)
    expect(group).toMatchObject({
      type: 'group',
      name: 'Weekend plans',
      memberIds: ['alice', 'bob', 'carol'],
    })
  })

  it('closes with the close button and with Escape', async () => {
    const { user, onClose } = await renderDialog()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
