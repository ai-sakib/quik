import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { logListenerError } from './converters'
import { joinCall } from './signaling'

/**
 * Data model:
 *   calls/{callId}                      { conversationId, memberIds, kind, startedBy, status }
 *   calls/{callId}/participants/{uid}   { sessionId }  – who is in the call right now
 *   calls/{callId}/signals/{id}         WebRTC offers/answers/ICE candidates between two people
 *
 * The conversation also stores `activeCall` so members can see (and ring for) ongoing calls.
 */
export function createCallsApi(db) {
  const callsRef = collection(db, 'calls')

  async function end(callId) {
    const callRef = doc(callsRef, callId)

    await runTransaction(db, async (transaction) => {
      const call = await transaction.get(callRef)
      if (!call.exists() || call.data().status === 'ended') return

      const conversationRef = doc(db, 'conversations', call.data().conversationId)
      const conversation = await transaction.get(conversationRef)

      transaction.update(callRef, { status: 'ended', endedAt: serverTimestamp() })
      if (conversation.data()?.activeCall?.id === callId) {
        transaction.update(conversationRef, { activeCall: null })
      }
    })
  }

  return {
    async start({ conversation, kind, startedBy }) {
      const callRef = doc(callsRef)
      const batch = writeBatch(db)

      batch.set(callRef, {
        conversationId: conversation.id,
        memberIds: conversation.memberIds,
        kind,
        startedBy,
        status: 'active',
        createdAt: serverTimestamp(),
      })
      batch.update(doc(db, 'conversations', conversation.id), {
        activeCall: { id: callRef.id, kind, startedBy, startedAt: serverTimestamp() },
      })
      await batch.commit()
      return callRef.id
    },

    subscribe(callId, callback) {
      return onSnapshot(
        doc(callsRef, callId),
        (snapshot) => {
          if (!snapshot.exists()) return
          const { status, kind, conversationId } = snapshot.data()
          callback({ id: snapshot.id, status, kind, conversationId })
        },
        logListenerError('call'),
      )
    },

    end,

    join(callId, userId) {
      return joinCall(db, callId, userId, { onEmpty: () => end(callId) })
    },
  }
}
