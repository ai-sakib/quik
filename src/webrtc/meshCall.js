/**
 * A "mesh" call: every participant has a direct WebRTC connection to every other
 * participant. No media server is needed, which keeps the app simple and free to host.
 * It works well for small groups (roughly up to 6 people).
 *
 * The backend provides a signaling channel with this shape:
 *
 *   channel.userId, channel.sessionId
 *   channel.subscribeParticipants({ onJoin, onLeave })   participant = { userId, sessionId }
 *   channel.subscribeSignals(onSignal)                    signal = { from: participant, type, description, candidate }
 *   channel.send(toParticipant, { type, description?, candidate? })
 *   channel.leave()
 *
 * Who sends the offer? For every pair of people, the one with the smaller user id.
 * Both sides apply the same rule, so two people never send offers to each other at once.
 */
export function startMeshCall({
  channel,
  localStream,
  iceServers = [],
  onRemoteStream = () => {},
  onPeerLeft = () => {},
  onPeerStateChange = () => {},
}) {
  const myUserId = channel.userId
  const peers = new Map() // userId -> { participant, connection, pendingCandidates }
  const earlyCandidates = new Map() // candidates that arrived before the offer, per participant
  let hasEnded = false

  // WebRTC calls are async. Handle signaling events strictly one after another, in the
  // order they arrived (e.g. an offer must be applied before its ICE candidates).
  let queue = Promise.resolve()
  const handleInOrder = (handler) => (event) => {
    queue = queue
      .then(() => (hasEnded ? undefined : handler(event)))
      .catch((error) => console.error('[call] signaling error', error))
  }

  function send(participant, payload) {
    Promise.resolve(channel.send(participant, payload)).catch((error) =>
      console.error('[call] could not send signal', error),
    )
  }

  function connectTo(participant) {
    const connection = new RTCPeerConnection({ iceServers })
    localStream.getTracks().forEach((track) => connection.addTrack(track, localStream))

    connection.onicecandidate = ({ candidate }) => {
      if (candidate) send(participant, { type: 'candidate', candidate: candidate.toJSON() })
    }
    connection.ontrack = ({ streams }) => onRemoteStream(participant.userId, streams[0])
    connection.onconnectionstatechange = () =>
      onPeerStateChange(participant.userId, connection.connectionState)

    const key = participantKey(participant)
    const peer = { participant, connection, pendingCandidates: earlyCandidates.get(key) ?? [] }
    earlyCandidates.delete(key)
    peers.set(participant.userId, peer)
    return peer
  }

  function disconnect(userId) {
    const peer = peers.get(userId)
    if (!peer) return
    peer.connection.close()
    peers.delete(userId)
    onPeerLeft(userId)
  }

  /** The peer for this exact session, or null if we only know an older session of that user. */
  function currentPeer(participant) {
    const peer = peers.get(participant.userId)
    return peer?.participant.sessionId === participant.sessionId ? peer : null
  }

  async function applyPendingCandidates(peer) {
    for (const candidate of peer.pendingCandidates.splice(0)) {
      await peer.connection.addIceCandidate(candidate)
    }
  }

  async function handleJoin(participant) {
    if (participant.userId === myUserId || currentPeer(participant)) return

    disconnect(participant.userId) // they re-joined (new session), drop the old connection
    if (myUserId > participant.userId) return // they will send us an offer

    const { connection } = connectTo(participant)
    const offer = await connection.createOffer()
    await connection.setLocalDescription(offer)
    send(participant, { type: 'offer', description: toPlainDescription(offer) })
  }

  function handleLeave(participant) {
    if (currentPeer(participant)) disconnect(participant.userId)
  }

  async function handleOffer({ from, description }) {
    if (!currentPeer(from)) {
      disconnect(from.userId)
      connectTo(from)
    }
    const peer = currentPeer(from)
    await peer.connection.setRemoteDescription(description)
    const answer = await peer.connection.createAnswer()
    await peer.connection.setLocalDescription(answer)
    send(from, { type: 'answer', description: toPlainDescription(answer) })
    await applyPendingCandidates(peer)
  }

  async function handleAnswer({ from, description }) {
    const peer = currentPeer(from)
    if (!peer) return
    await peer.connection.setRemoteDescription(description)
    await applyPendingCandidates(peer)
  }

  async function handleCandidate({ from, candidate }) {
    const peer = currentPeer(from)
    if (peer?.connection.remoteDescription) {
      await peer.connection.addIceCandidate(candidate)
    } else if (peer) {
      peer.pendingCandidates.push(candidate)
    } else {
      const key = participantKey(from)
      earlyCandidates.set(key, [...(earlyCandidates.get(key) ?? []), candidate])
    }
  }

  const signalHandlers = { offer: handleOffer, answer: handleAnswer, candidate: handleCandidate }

  channel.subscribeSignals(handleInOrder((signal) => signalHandlers[signal.type]?.(signal)))
  channel.subscribeParticipants({
    onJoin: handleInOrder(handleJoin),
    onLeave: handleInOrder(handleLeave),
  })

  return {
    async hangUp() {
      hasEnded = true
      ;[...peers.keys()].forEach(disconnect)
      await channel.leave()
    },
  }
}

function participantKey({ userId, sessionId }) {
  return `${userId}:${sessionId}`
}

/** Firestore can only store plain objects, not RTCSessionDescription instances. */
function toPlainDescription({ type, sdp }) {
  return { type, sdp }
}
