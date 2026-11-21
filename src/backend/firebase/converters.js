/** Firestore Timestamp -> milliseconds since epoch (or null). */
export function toMillis(timestamp) {
  return timestamp?.toMillis?.() ?? null
}

/** Reads a document, using the local estimate for server timestamps that are still pending. */
export function readData(snapshot) {
  return snapshot.data({ serverTimestamps: 'estimate' })
}

/** Error handler for onSnapshot listeners (e.g. permission denied, or offline for too long). */
export function logListenerError(what) {
  return (error) => console.error(`[firestore] could not load ${what}`, error)
}
