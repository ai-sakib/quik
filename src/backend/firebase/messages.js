import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { logListenerError, readData, toMillis } from './converters'

const MESSAGE_LIMIT = 200

export function createMessagesApi(db) {
  return {
    subscribe(conversationId, callback) {
      const latestMessages = query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('sentAt', 'desc'),
        limit(MESSAGE_LIMIT),
      )
      return onSnapshot(
        latestMessages,
        (snapshot) => callback(snapshot.docs.map(toMessage).reverse()),
        logListenerError('messages'),
      )
    },

    /** Saves the message and updates the conversation preview in one atomic write. */
    async send(conversationId, { senderId, text }) {
      const conversationRef = doc(db, 'conversations', conversationId)
      const messageRef = doc(collection(conversationRef, 'messages'))

      const batch = writeBatch(db)
      batch.set(messageRef, { senderId, text, sentAt: serverTimestamp() })
      batch.update(conversationRef, {
        lastMessage: { senderId, text, sentAt: serverTimestamp() },
        updatedAt: serverTimestamp(),
      })
      await batch.commit()
    },
  }
}

function toMessage(snapshot) {
  const data = readData(snapshot)
  return {
    id: snapshot.id,
    senderId: data.senderId,
    text: data.text,
    sentAt: toMillis(data.sentAt),
  }
}
