/** The same two people always share one direct conversation, so its id is derived from theirs. */
export function directConversationId(userId, otherUserId) {
  return ['direct', ...[userId, otherUserId].sort()].join('_')
}

export function otherMemberId(conversation, myId) {
  return conversation.memberIds.find((id) => id !== myId) ?? myId
}

export function conversationTitle(conversation, myId, usersById) {
  if (conversation.type === 'group') return conversation.name || 'Group'
  return usersById[otherMemberId(conversation, myId)]?.name ?? 'Unknown user'
}

export function lastMessagePreview(conversation, myId, usersById) {
  const message = conversation.lastMessage
  if (!message) return conversation.type === 'group' ? 'Group created' : 'Say hi 👋'
  if (message.senderId === myId) return `You: ${message.text}`
  if (conversation.type === 'group') {
    const sender = usersById[message.senderId]?.name?.split(' ')[0] ?? 'Someone'
    return `${sender}: ${message.text}`
  }
  return message.text
}
