import { createAuthApi } from './auth'
import { createCallsApi } from './calls'
import { createConversationsApi } from './conversations'
import { createMessagesApi } from './messages'
import { createUsersApi } from './users'

export { EMULATOR_CONFIG, initFirebase, readFirebaseConfig } from './app'

/** Builds the app's backend on top of Firebase Auth + Cloud Firestore. */
export function createFirebaseBackend({ auth, db }) {
  return {
    auth: createAuthApi(auth),
    users: createUsersApi(db),
    conversations: createConversationsApi(db),
    messages: createMessagesApi(db),
    calls: createCallsApi(db),
  }
}
