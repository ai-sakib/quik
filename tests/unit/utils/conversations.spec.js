import { describe, expect, it } from 'vitest'
import {
  conversationTitle,
  directConversationId,
  lastMessagePreview,
  otherMemberId,
} from '@/utils/conversations'

const usersById = {
  alice: { id: 'alice', name: 'Alice Anderson' },
  bob: { id: 'bob', name: 'Bob Brown' },
}
const direct = { type: 'direct', memberIds: ['alice', 'bob'], lastMessage: null }
const group = { type: 'group', name: 'Team', memberIds: ['alice', 'bob'], lastMessage: null }

describe('directConversationId', () => {
  it('is the same no matter who starts the conversation', () => {
    expect(directConversationId('bob', 'alice')).toBe(directConversationId('alice', 'bob'))
    expect(directConversationId('alice', 'bob')).toBe('direct_alice_bob')
  })
})

describe('otherMemberId', () => {
  it('returns the other person of a direct conversation', () => {
    expect(otherMemberId(direct, 'alice')).toBe('bob')
  })
})

describe('conversationTitle', () => {
  it('uses the other person’s name for direct conversations', () => {
    expect(conversationTitle(direct, 'alice', usersById)).toBe('Bob Brown')
  })

  it('uses the group name for groups', () => {
    expect(conversationTitle(group, 'alice', usersById)).toBe('Team')
  })

  it('falls back when the other person is unknown', () => {
    expect(conversationTitle(direct, 'alice', {})).toBe('Unknown user')
  })
})

describe('lastMessagePreview', () => {
  it('shows a hint for empty conversations', () => {
    expect(lastMessagePreview(direct, 'alice', usersById)).toBe('Say hi 👋')
    expect(lastMessagePreview(group, 'alice', usersById)).toBe('Group created')
  })

  it('prefixes my own messages with "You"', () => {
    const conversation = { ...direct, lastMessage: { senderId: 'alice', text: 'Hey' } }
    expect(lastMessagePreview(conversation, 'alice', usersById)).toBe('You: Hey')
  })

  it('prefixes group messages with the sender’s first name', () => {
    const conversation = { ...group, lastMessage: { senderId: 'bob', text: 'Hi all' } }
    expect(lastMessagePreview(conversation, 'alice', usersById)).toBe('Bob: Hi all')
  })

  it('shows direct messages from the other person as they are', () => {
    const conversation = { ...direct, lastMessage: { senderId: 'bob', text: 'Hello' } }
    expect(lastMessagePreview(conversation, 'alice', usersById)).toBe('Hello')
  })
})
