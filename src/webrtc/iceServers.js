/**
 * STUN lets peers discover their public address, which is enough for most networks.
 * A TURN server (optional, via env vars) relays media when a direct connection is impossible.
 */
export function getIceServers(env = import.meta.env) {
  const servers = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]

  if (env.VITE_TURN_URL) {
    servers.push({
      urls: env.VITE_TURN_URL,
      username: env.VITE_TURN_USERNAME,
      credential: env.VITE_TURN_CREDENTIAL,
    })
  }
  return servers
}
