import { inject } from 'vue'

/**
 * The "backend" is everything that talks to the outside world: authentication,
 * the database and call signaling. Components and stores only use this small
 * interface, so the real Firebase implementation can be swapped for an
 * in-memory one in tests.
 *
 * Shape of a backend (all `subscribe*` functions return an `unsubscribe` function):
 *
 *   auth.onChange(callback(user | null))
 *   auth.signInWithGoogle()
 *   auth.signOut()
 *
 *   users.saveProfile(user)
 *   users.subscribe(callback(users[]))
 *
 *   conversations.subscribeForUser(userId, callback(conversations[]))
 *   conversations.openDirect(userId, otherUserId)           -> conversationId
 *   conversations.createGroup({ name, memberIds, createdBy }) -> conversationId
 *
 *   messages.subscribe(conversationId, callback(messages[]))
 *   messages.send(conversationId, { senderId, text })
 *
 *   calls.start({ conversation, kind, startedBy })  -> callId
 *   calls.subscribe(callId, callback(call))
 *   calls.end(callId)
 *   calls.join(callId, userId)                      -> SignalingChannel (see src/webrtc/meshCall.js)
 */

export const BackendKey = Symbol('backend')

export function createBackendPlugin(backend) {
  return {
    install(app) {
      app.provide(BackendKey, backend)
    },
  }
}

export function useBackend() {
  const backend = inject(BackendKey, null)
  if (!backend) {
    throw new Error('No backend provided. Install it with app.use(createBackendPlugin(backend)).')
  }
  return backend
}
