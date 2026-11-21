import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'

export function createAuthApi(auth) {
  return {
    onChange(callback) {
      return onAuthStateChanged(auth, (firebaseUser) => {
        callback(firebaseUser ? toAppUser(firebaseUser) : null)
      })
    },

    async signInWithGoogle() {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
    },

    signOut() {
      return signOut(auth)
    },
  }
}

function toAppUser(firebaseUser) {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || firebaseUser.email,
    email: firebaseUser.email,
    photoURL: firebaseUser.photoURL ?? null,
  }
}
