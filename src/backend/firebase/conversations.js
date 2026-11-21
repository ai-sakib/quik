import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { directConversationId } from '@/utils/conversations'
import { logListenerError, readData, toMillis } from './converters'

export function createConversationsApi(db) {
  const conversationsRef = collection(db, 'conversations')

  return {
    subscribeForUser(userId, callback) {
      const userConversations = query(
        conversationsRef,
        where('memberIds', 'array-contains', userId),
      )
      return onSnapshot(
        userConversations,
        (snapshot) => callback(snapshot.docs.map(toConversation)),
        logListenerError('conversations'),
      )
    },

    /** Returns the 1:1 conversation between two users, creating it the first time. */
    async openDirect(userId, otherUserId) {
      const id = directConversationId(userId, otherUserId)
      const conversationRef = doc(conversationsRef, id)

      await runTransaction(db, async (transaction) => {
        const existing = await transaction.get(conversationRef)
        if (existing.exists()) return

        transaction.set(conversationRef, {
          ...newConversation(userId, [userId, otherUserId]),
          type: 'direct',
        })
      })
      return id
    },

    async createGroup({ name, memberIds, createdBy }) {
      const created = await addDoc(conversationsRef, {
        ...newConversation(createdBy, memberIds),
        type: 'group',
        name: name.trim(),
      })
      return created.id
    },
  }
}

function newConversation(createdBy, memberIds) {
  return {
    name: null,
    memberIds: [...new Set(memberIds)].sort(),
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessage: null,
    activeCall: null,
  }
}

function toConversation(snapshot) {
  const data = readData(snapshot)
  return {
    id: snapshot.id,
    type: data.type,
    name: data.name ?? null,
    memberIds: data.memberIds,
    updatedAt: toMillis(data.updatedAt),
    lastMessage: data.lastMessage && {
      text: data.lastMessage.text,
      senderId: data.lastMessage.senderId,
      sentAt: toMillis(data.lastMessage.sentAt),
    },
    activeCall: data.activeCall && {
      id: data.activeCall.id,
      kind: data.activeCall.kind,
      startedBy: data.activeCall.startedBy,
      startedAt: toMillis(data.activeCall.startedAt),
    },
  }
}
