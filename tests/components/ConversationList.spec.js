import { RouterLinkStub } from '@vue/test-utils'
import { render, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import ConversationList from '@/components/conversations/ConversationList.vue'

const usersById = {
  alice: { id: 'alice', name: 'Alice Anderson' },
  bob: { id: 'bob', name: 'Bob Brown', photoURL: 'https://example.com/bob.png' },
}

function renderList(conversations, selectedId = null) {
  return render(ConversationList, {
    props: { conversations, currentUserId: 'alice', usersById, selectedId },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('ConversationList', () => {
  it('shows an empty state without conversations', () => {
    renderList([])
    expect(screen.getByText('No conversations yet')).toBeInTheDocument()
  })

  it('shows direct and group conversations with their last message', () => {
    renderList([
      {
        id: 'direct_alice_bob',
        type: 'direct',
        memberIds: ['alice', 'bob'],
        lastMessage: { senderId: 'bob', text: 'See you soon', sentAt: Date.now() },
      },
      {
        id: 'g1',
        type: 'group',
        name: 'Book club',
        memberIds: ['alice', 'bob'],
        lastMessage: null,
      },
    ])

    expect(screen.getByText('Bob Brown')).toBeInTheDocument()
    expect(screen.getByText('See you soon')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Bob Brown' })).toHaveAttribute(
      'src',
      usersById.bob.photoURL,
    )
    expect(screen.getByText('Book club')).toBeInTheDocument()
    expect(screen.getByText('Group created')).toBeInTheDocument()
  })

  it('links each conversation to its page and marks the open one', () => {
    renderList(
      [
        {
          id: 'g1',
          type: 'group',
          name: 'Book club',
          memberIds: ['alice', 'bob'],
          lastMessage: null,
        },
      ],
      'g1',
    )
    const link = screen.getByText('Book club').closest('a')
    expect(link).toHaveAttribute('aria-current', 'page')
  })

  it('highlights conversations with a call in progress', () => {
    renderList([
      {
        id: 'g1',
        type: 'group',
        name: 'Book club',
        memberIds: ['alice', 'bob'],
        lastMessage: null,
        activeCall: { id: 'c1', kind: 'video', startedBy: 'bob' },
      },
    ])
    expect(screen.getByText('Call in progress')).toBeInTheDocument()
  })
})
