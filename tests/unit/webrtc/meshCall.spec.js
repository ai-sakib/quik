import { describe, expect, it, vi } from 'vitest'
import { startMeshCall } from '@/webrtc/meshCall'
import {
  FakeMediaStream,
  FakeMediaStreamTrack,
  FakeRTCPeerConnection,
} from '@tests/support/fakeWebRTC'

/** A signaling channel the test controls by hand. */
function createTestChannel(userId) {
  const handlers = {}
  const sent = []
  return {
    userId,
    sessionId: `${userId}-session`,
    sent,
    subscribeParticipants(participantHandlers) {
      handlers.participants = participantHandlers
    },
    subscribeSignals(onSignal) {
      handlers.onSignal = onSignal
    },
    send: vi.fn(async (to, payload) => {
      sent.push({ to, ...payload })
    }),
    leave: vi.fn(async () => {}),

    // --- test controls ---
    participantJoins: (participant) => handlers.participants.onJoin(participant),
    participantLeaves: (participant) => handlers.participants.onLeave(participant),
    receive: (signal) => handlers.onSignal(signal),
  }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))
const streamWithAudio = () => new FakeMediaStream([new FakeMediaStreamTrack('audio')])

const ALICE = { userId: 'alice', sessionId: 'alice-session' }
const BOB = { userId: 'bob', sessionId: 'bob-session' }

/** Creates "Alice's" side of a connection, ready to send an offer to whoever we are. */
async function createRemoteOffer(stream) {
  const remote = new RTCPeerConnection()
  remote.addTrack(stream.getTracks()[0], stream)
  const offer = await remote.createOffer()
  await remote.setLocalDescription(offer)
  return { remote, offer }
}

function setup(userId, options = {}) {
  const channel = createTestChannel(userId)
  const localStream = streamWithAudio()
  const callbacks = { onRemoteStream: vi.fn(), onPeerLeft: vi.fn() }
  const mesh = startMeshCall({
    channel,
    localStream,
    iceServers: [{ urls: 'stun:example.org' }],
    ...callbacks,
    ...options,
  })
  return { channel, localStream, mesh, ...callbacks }
}

describe('startMeshCall', () => {
  it('sends an offer to participants whose user id sorts after ours', async () => {
    const { channel, localStream } = setup('alice')

    channel.participantJoins(BOB)
    await settle()

    const [connection] = FakeRTCPeerConnection.instances
    expect(connection.configuration).toEqual({ iceServers: [{ urls: 'stun:example.org' }] })
    expect(connection.localStreams.has(localStream)).toBe(true)
    expect(channel.sent[0]).toEqual({
      to: BOB,
      type: 'offer',
      description: { type: 'offer', sdp: expect.any(String) },
    })
  })

  it('waits for an offer from participants whose user id sorts before ours', async () => {
    const { channel } = setup('bob')

    channel.participantJoins(ALICE)
    await settle()

    expect(FakeRTCPeerConnection.instances).toHaveLength(0)
    expect(channel.sent).toHaveLength(0)
  })

  it('ignores our own participant entry', async () => {
    const { channel } = setup('alice')

    channel.participantJoins(ALICE)
    await settle()

    expect(FakeRTCPeerConnection.instances).toHaveLength(0)
  })

  it('answers an offer and reports the remote stream', async () => {
    const { channel, onRemoteStream } = setup('bob')
    const aliceStream = streamWithAudio()
    const { offer } = await createRemoteOffer(aliceStream)

    channel.receive({ from: ALICE, type: 'offer', description: offer })
    await settle()

    expect(channel.sent).toContainEqual({
      to: ALICE,
      type: 'answer',
      description: { type: 'answer', sdp: expect.any(String) },
    })
    expect(onRemoteStream).toHaveBeenCalledWith('alice', aliceStream)
  })

  it('sends its ICE candidates to the other person', async () => {
    const { channel } = setup('alice')

    channel.participantJoins(BOB)
    await vi.waitFor(() =>
      expect(channel.sent).toContainEqual({
        to: BOB,
        type: 'candidate',
        candidate: expect.objectContaining({ candidate: expect.stringContaining('candidate:') }),
      }),
    )
  })

  it('keeps ICE candidates that arrive before the offer and applies them later', async () => {
    const { channel } = setup('bob')
    const candidate = { candidate: 'candidate:early', sdpMid: '0', sdpMLineIndex: 0 }
    const { offer } = await createRemoteOffer(streamWithAudio())

    channel.receive({ from: ALICE, type: 'candidate', candidate })
    channel.receive({ from: ALICE, type: 'offer', description: offer })
    await settle()

    const bobsConnection = FakeRTCPeerConnection.instances.at(-1)
    expect(bobsConnection.addedCandidates).toEqual([candidate])
  })

  it('closes the connection when a participant leaves', async () => {
    const { channel, onPeerLeft } = setup('alice')
    channel.participantJoins(BOB)
    await settle()

    channel.participantLeaves(BOB)
    await settle()

    expect(FakeRTCPeerConnection.instances[0].connectionState).toBe('closed')
    expect(onPeerLeft).toHaveBeenCalledWith('bob')
  })

  it('reconnects when a participant re-joins with a new session', async () => {
    const { channel } = setup('alice')
    const bobAfterReload = { userId: 'bob', sessionId: 'bob-session-2' }

    channel.participantJoins(BOB)
    channel.participantJoins(bobAfterReload)
    await settle()

    const [first, second] = FakeRTCPeerConnection.instances
    expect(first.connectionState).toBe('closed')
    expect(second.connectionState).not.toBe('closed')
    expect(channel.sent.filter((signal) => signal.type === 'offer').map((s) => s.to)).toEqual([
      BOB,
      bobAfterReload,
    ])
  })

  it('ignores answers from an old session', async () => {
    const { channel } = setup('alice')
    channel.participantJoins(BOB)
    await settle()

    const staleBob = { userId: 'bob', sessionId: 'old-session' }
    channel.receive({ from: staleBob, type: 'answer', description: { type: 'answer', sdp: 'x:1' } })
    await settle()

    expect(FakeRTCPeerConnection.instances[0].remoteDescription).toBeNull()
  })

  it('hangs up: closes every connection, leaves the channel and ignores later events', async () => {
    const { channel, mesh } = setup('alice')
    channel.participantJoins(BOB)
    await settle()

    await mesh.hangUp()
    channel.participantJoins({ userId: 'carol', sessionId: 'carol-session' })
    await settle()

    expect(FakeRTCPeerConnection.instances).toHaveLength(1)
    expect(FakeRTCPeerConnection.instances[0].connectionState).toBe('closed')
    expect(channel.leave).toHaveBeenCalled()
  })
})
