import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { logListenerError } from './converters'

export function createUsersApi(db) {
  const usersRef = collection(db, 'users')

  return {
    saveProfile(user) {
      return setDoc(
        doc(usersRef, user.id),
        {
          name: user.name,
          email: user.email,
          photoURL: user.photoURL,
          lastSeenAt: serverTimestamp(),
        },
        { merge: true },
      )
    },

    subscribe(callback) {
      return onSnapshot(
        usersRef,
        (snapshot) => callback(snapshot.docs.map(toUser)),
        logListenerError('users'),
      )
    },
  }
}

function toUser(snapshot) {
  const { name, email, photoURL } = snapshot.data()
  return { id: snapshot.id, name, email, photoURL: photoURL ?? null }
}
