import { directConversationId } from '@/utils/conversations'

export const ALICE = {
  id: 'alice',
  name: 'Alice Anderson',
  email: 'alice@example.com',
  photoURL: null,
}
export const BOB = { id: 'bob', name: 'Bob Brown', email: 'bob@example.com', photoURL: null }
export const CAROL = {
  id: 'carol',
  name: 'Carol Clark',
  email: 'carol@example.com',
  photoURL: null,
}

/**
 * In-memory stand-in for the Firebase backend (same interface as src/backend/firebase).
 *
 *   const server = createFakeServer()
 *   const alice = server.connect(ALICE)                     // signed out, can "sign in with Google"
 *   const bob = server.connect(BOB, { signedIn: true })
 *
 * Every client connected to the same server shares one "database", so Alice and Bob
 * can chat and call each other – just like two browsers talking to Firestore.
 * Listeners are notified asynchronously, like Firestore's.
 */
export function createFakeServer() {
  const db = {
    users: new Map(),
    conversations: new Map(),
    messages: new Map(), // conversationId -> message[]
    calls: new Map(),
    participants: new Map(), // callId -> Map(userId -> sessionId)
    signals: [],
  }

  const listeners = new Set()
  let lastId = 0
  let lastTime = 0
  const newId = (prefix) => `${prefix}-${++lastId}`
  const now = () => (lastTime = Math.max(Date.now(), lastTime + 1)) // strictly increasing

  function notify() {
    queueMicrotask(() => [...listeners].forEach((listener) => listener()))
  }

  function listen(listener) {
    listeners.add(listener)
    queueMicrotask(() => listeners.has(listener) && listener())
    return () => listeners.delete(listener)
  }

  /** Calls `callback` with a copy of `read()` now and whenever that result changes. */
  function watch(read, callback) {
    let previous
    return listen(() => {
      const value = read()
      const json = JSON.stringify(value)
      if (value === undefined || json === previous) return
      previous = json
      callback(JSON.parse(json))
    })
  }

  // --- Writes ---------------------------------------------------------------

  function saveUser(user) {
    const { id, name, email, photoURL = null } = user
    db.users.set(id, { id, name, email, photoURL })
    notify()
  }

  function updateConversation(id, changes) {
    db.conversations.set(id, { ...db.conversations.get(id), ...changes })
    notify()
  }

  function createConversation({ id = newId('group'), type, name = null, memberIds, createdBy }) {
    db.conversations.set(id, {
      id,
      type,
      name,
      memberIds: [...new Set(memberIds)].sort(),
      createdBy,
      updatedAt: now(),
      lastMessage: null,
      activeCall: null,
    })
    notify()
    return id
  }

  function sendMessage(conversationId, { senderId, text }) {
    const message = { id: newId('message'), senderId, text, sentAt: now() }
    db.messages.set(conversationId, [...(db.messages.get(conversationId) ?? []), message])
    updateConversation(conversationId, {
      lastMessage: { senderId, text, sentAt: message.sentAt },
      updatedAt: message.sentAt,
    })
  }

  function startCall({ conversation, kind, startedBy }) {
    const id = newId('call')
    db.calls.set(id, {
      id,
      conversationId: conversation.id,
      memberIds: conversation.memberIds,
      kind,
      startedBy,
      status: 'active',
    })
    updateConversation(conversation.id, { activeCall: { id, kind, startedBy, startedAt: now() } })
    return id
  }

  function endCall(callId) {
    const call = db.calls.get(callId)
    if (!call || call.status === 'ended') return

    db.calls.set(callId, { ...call, status: 'ended' })
    if (db.conversations.get(call.conversationId)?.activeCall?.id === callId) {
      updateConversation(call.conversationId, { activeCall: null })
    }
    notify()
  }

  function joinCall(callId, userId) {
    const sessionId = newId('session')
    const participants = db.participants.get(callId) ?? new Map()
    db.participants.set(callId, participants)
    participants.set(userId, sessionId)
    notify()

    const unsubscribers = []
    let sentSignals = 0

    return {
      userId,
      sessionId,

      // Same events as Firestore's docChanges(): "removed" -> onLeave, "added"/"modified" -> onJoin.
      subscribeParticipants({ onJoin, onLeave }) {
        let known = new Map()
        const unsubscribe = listen(() => {
          const current = new Map(participants)
          for (const [id, session] of known) {
            if (!current.has(id)) onLeave({ userId: id, sessionId: session })
          }
          for (const [id, session] of current) {
            if (known.get(id) !== session) onJoin({ userId: id, sessionId: session })
          }
          known = current
        })
        unsubscribers.push(unsubscribe)
      },

      subscribeSignals(onSignal) {
        const delivered = new Set()
        const unsubscribe = listen(() => {
          for (const signal of db.signals) {
            const isForMe = signal.to === userId && signal.toSession === sessionId
            if (!isForMe || delivered.has(signal.id)) continue
            delivered.add(signal.id)
            onSignal({
              from: { userId: signal.from, sessionId: signal.fromSession },
              type: signal.type,
              description: signal.description ?? null,
              candidate: signal.candidate ?? null,
            })
          }
        })
        unsubscribers.push(unsubscribe)
      },

      async send(to, payload) {
        db.signals.push({
          ...JSON.parse(JSON.stringify(payload)), // like Firestore: only plain data survives
          id: newId('signal'),
          callId,
          from: userId,
          fromSession: sessionId,
          to: to.userId,
          toSession: to.sessionId,
          seq: sentSignals++,
        })
        notify()
      },

      async leave() {
        unsubscribers.forEach((unsubscribe) => unsubscribe())
        if (participants.get(userId) === sessionId) participants.delete(userId)
        notify()
        if (participants.size === 0) endCall(callId)
      },
    }
  }

  // --- One client per "browser" ----------------------------------------------

  function connect(account, { signedIn = false, signInError = null } = {}) {
    let currentUser = signedIn ? { ...account } : null
    const authListeners = new Set()

    function setCurrentUser(user) {
      currentUser = user
      authListeners.forEach((listener) => listener(user))
    }

    return {
      auth: {
        onChange(listener) {
          authListeners.add(listener)
          queueMicrotask(() => authListeners.has(listener) && listener(currentUser))
          return () => authListeners.delete(listener)
        },
        async signInWithGoogle() {
          if (signInError) throw signInError
          setCurrentUser({ ...account })
        },
        async signOut() {
          setCurrentUser(null)
        },
      },

      users: {
        async saveProfile(user) {
          saveUser(user)
        },
        subscribe(callback) {
          return watch(() => [...db.users.values()], callback)
        },
      },

      conversations: {
        subscribeForUser(userId, callback) {
          return watch(
            () => [...db.conversations.values()].filter((c) => c.memberIds.includes(userId)),
            callback,
          )
        },
        async openDirect(userId, otherUserId) {
          const id = directConversationId(userId, otherUserId)
          if (!db.conversations.has(id)) {
            createConversation({
              id,
              type: 'direct',
              memberIds: [userId, otherUserId],
              createdBy: userId,
            })
          }
          return id
        },
        async createGroup({ name, memberIds, createdBy }) {
          return createConversation({ type: 'group', name, memberIds, createdBy })
        },
      },

      messages: {
        subscribe(conversationId, callback) {
          return watch(() => db.messages.get(conversationId) ?? [], callback)
        },
        async send(conversationId, message) {
          sendMessage(conversationId, message)
        },
      },

      calls: {
        async start(options) {
          return startCall(options)
        },
        subscribe(callId, callback) {
          return watch(() => db.calls.get(callId), callback)
        },
        async end(callId) {
          endCall(callId)
        },
        async join(callId, userId) {
          return joinCall(callId, userId)
        },
      },
    }
  }

  return { db, connect, saveUser }
}
