import { vi } from 'vitest'

/**
 * jsdom has no WebRTC or camera. These fakes behave just enough like the real APIs:
 * two FakeRTCPeerConnections "connect" once they have exchanged an offer and an answer,
 * and then each receives the other side's local stream through `ontrack`.
 */

let lastId = 0
const connectionsById = new Map()

export class FakeMediaStreamTrack {
  constructor(kind) {
    this.id = `${kind}-track-${++lastId}`
    this.kind = kind
    this.enabled = true
    this.readyState = 'live'
  }

  stop() {
    this.readyState = 'ended'
  }
}

export class FakeMediaStream {
  constructor(tracks = []) {
    this.id = `stream-${++lastId}`
    this.tracks = tracks
  }

  getTracks() {
    return [...this.tracks]
  }

  getAudioTracks() {
    return this.tracks.filter((track) => track.kind === 'audio')
  }

  getVideoTracks() {
    return this.tracks.filter((track) => track.kind === 'video')
  }
}

class FakeIceCandidate {
  constructor(connectionId) {
    this.candidate = `candidate:fake-${connectionId}`
  }

  toJSON() {
    return { candidate: this.candidate, sdpMid: '0', sdpMLineIndex: 0 }
  }
}

export class FakeRTCPeerConnection {
  static instances = []

  constructor(configuration) {
    this.id = ++lastId
    this.configuration = configuration
    this.localDescription = null
    this.remoteDescription = null
    this.connectionState = 'new'
    this.localStreams = new Set()
    this.addedCandidates = []
    connectionsById.set(this.id, this)
    FakeRTCPeerConnection.instances.push(this)
  }

  addTrack(_track, stream) {
    this.localStreams.add(stream)
  }

  async createOffer() {
    return { type: 'offer', sdp: `fake-sdp:${this.id}` }
  }

  async createAnswer() {
    if (!this.remoteDescription) throw new Error('InvalidStateError: no remote offer')
    return { type: 'answer', sdp: `fake-sdp:${this.id}` }
  }

  async setLocalDescription(description) {
    this.localDescription = description
    // Like a browser: ICE candidates are discovered a moment later.
    setTimeout(() => {
      if (this.connectionState !== 'closed') {
        this.onicecandidate?.({ candidate: new FakeIceCandidate(this.id) })
      }
    })
    this.#connectIfReady()
  }

  async setRemoteDescription(description) {
    this.remoteDescription = description
    this.remote = connectionsById.get(Number(description.sdp.split(':')[1]))
    this.#connectIfReady()
  }

  async addIceCandidate(candidate) {
    if (!this.remoteDescription) throw new Error('InvalidStateError: remote description not set')
    this.addedCandidates.push(candidate)
  }

  close() {
    this.connectionState = 'closed'
  }

  #connectIfReady() {
    if (!this.localDescription || !this.remoteDescription) return
    if (this.connectionState !== 'new') return

    this.connectionState = 'connected'
    this.onconnectionstatechange?.()
    for (const stream of this.remote?.localStreams ?? []) {
      this.ontrack?.({ streams: [stream], track: stream.getTracks()[0] })
    }
  }
}

/** Replaces the browser's WebRTC + camera APIs with the fakes. Returns the getUserMedia mock. */
export function installFakeWebRTC() {
  FakeRTCPeerConnection.instances = []
  connectionsById.clear()
  globalThis.RTCPeerConnection = FakeRTCPeerConnection
  globalThis.MediaStream = FakeMediaStream

  const getUserMedia = vi.fn(async (constraints) => {
    const tracks = [new FakeMediaStreamTrack('audio')]
    if (constraints.video) tracks.push(new FakeMediaStreamTrack('video'))
    return new FakeMediaStream(tracks)
  })
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  })
  return { getUserMedia }
}

export function permissionDeniedError() {
  const error = new Error('Permission denied')
  error.name = 'NotAllowedError'
  return error
}
