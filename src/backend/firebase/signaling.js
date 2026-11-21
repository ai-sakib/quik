import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { logListenerError } from './converters'

/**
 * Adds the user to a call and returns a signaling channel (see src/webrtc/meshCall.js).
 *
 * Every join gets a fresh `sessionId`, so signals meant for an earlier
 * session (e.g. before a page refresh) are ignored.
 */
export async function joinCall(db, callId, userId, { onEmpty }) {
  const sessionId = crypto.randomUUID()
  const callRef = doc(db, 'calls', callId)
  const participantsRef = collection(callRef, 'participants')
  const signalsRef = collection(callRef, 'signals')
  const myParticipantRef = doc(participantsRef, userId)

  const unsubscribers = []
  let sentSignals = 0

  await setDoc(myParticipantRef, { sessionId, joinedAt: serverTimestamp() })

  return {
    userId,
    sessionId,

    subscribeParticipants({ onJoin, onLeave }) {
      const unsubscribe = onSnapshot(
        participantsRef,
        (snapshot) => {
          for (const change of snapshot.docChanges()) {
            const participant = { userId: change.doc.id, sessionId: change.doc.data().sessionId }
            if (change.type === 'removed') onLeave(participant)
            else onJoin(participant) // "added", or "modified" when someone re-joins
          }
        },
        logListenerError('call participants'),
      )
      unsubscribers.push(unsubscribe)
    },

    subscribeSignals(onSignal) {
      const mySignals = query(
        signalsRef,
        where('to', '==', userId),
        where('toSession', '==', sessionId),
      )
      const unsubscribe = onSnapshot(
        mySignals,
        (snapshot) => {
          snapshot
            .docChanges()
            .filter((change) => change.type === 'added')
            .map((change) => change.doc.data())
            .sort((a, b) => a.seq - b.seq) // keep each sender's order (offer before candidates)
            .forEach((data) => onSignal(toSignal(data)))
        },
        logListenerError('call signals'),
      )
      unsubscribers.push(unsubscribe)
    },

    send(to, payload) {
      return addDoc(signalsRef, {
        ...payload,
        from: userId,
        fromSession: sessionId,
        to: to.userId,
        toSession: to.sessionId,
        seq: sentSignals++,
      })
    },

    async leave() {
      unsubscribers.forEach((unsubscribe) => unsubscribe())

      // Only remove our participant entry if another tab hasn't re-joined in the meantime.
      await runTransaction(db, async (transaction) => {
        const mine = await transaction.get(myParticipantRef)
        if (mine.data()?.sessionId === sessionId) transaction.delete(myParticipantRef)
      })

      const remaining = await getDocs(participantsRef)
      if (remaining.empty) await onEmpty()
    },
  }
}

function toSignal(data) {
  return {
    from: { userId: data.from, sessionId: data.fromSession },
    type: data.type,
    description: data.description ?? null,
    candidate: data.candidate ?? null,
  }
}
