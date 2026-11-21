import { render, screen, within } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import MessageList from '@/components/chat/MessageList.vue'

const usersById = {
  alice: { id: 'alice', name: 'Alice Anderson' },
  bob: { id: 'bob', name: 'Bob Brown' },
}
const messages = [
  { id: '1', senderId: 'bob', text: 'Hi Alice', sentAt: 1 },
  { id: '2', senderId: 'bob', text: 'How are you?', sentAt: 2 },
  { id: '3', senderId: 'alice', text: 'Great, thanks!', sentAt: 3 },
]

function renderList(props) {
  return render(MessageList, {
    props: { messages, currentUserId: 'alice', usersById, isGroup: false, ...props },
  })
}

const rowOf = (text) => screen.getByText(text).closest('li')

describe('MessageList', () => {
  it('shows all messages in order', () => {
    renderList()
    const items = within(screen.getByRole('list', { name: 'Messages' })).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Hi Alice'),
      expect.stringContaining('How are you?'),
      expect.stringContaining('Great, thanks!'),
    ])
  })

  it('puts my messages on the right and others on the left', () => {
    renderList()
    expect(rowOf('Great, thanks!').firstElementChild).toHaveClass('justify-end')
    expect(rowOf('Hi Alice').firstElementChild).toHaveClass('justify-start')
  })

  it('shows the sender’s name once per run of messages in groups', () => {
    renderList({ isGroup: true })
    expect(within(rowOf('Hi Alice')).getByText('Bob Brown')).toBeInTheDocument()
    expect(within(rowOf('How are you?')).queryByText('Bob Brown')).toBeNull()
    // ...and their avatar next to the last message of the run
    expect(
      within(rowOf('How are you?')).getByRole('img', { name: 'Bob Brown' }),
    ).toBeInTheDocument()
  })

  it('does not show sender names in 1:1 chats', () => {
    renderList({ isGroup: false })
    expect(screen.queryByText('Bob Brown')).toBeNull()
  })
})
