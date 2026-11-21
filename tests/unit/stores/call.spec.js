import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth'
import { RING_DURATION_MS, useCallStore } from '@/stores/call'
import { useConversationsStore } from '@/stores/conversations'
import { ALICE, BOB, CAROL, createFakeServer } from '@tests/support/fakeBackend'
import { permissionDeniedError } from '@tests/support/fakeWebRTC'
import { createStoreContext } from '@tests/support/render'

/** Signs `account` in on its own "device" and returns its stores. */
async function signIn(server, account) {
  const pinia = createStoreContext(server.connect(account, { signedIn: true }))
  const auth = useAuthStore(pinia)
  await auth.init()
  const conversations = useConversationsStore(pinia)
  conversations.start()
  await flushPromises()
  return { auth, conversations, call: useCallStore(pinia) }
}

async function setupDirectChat() {
  const server = createFakeServer()
  const alice = await signIn(server, ALICE)
  const bob = await signIn(server, BOB)
  const conversationId = await alice.conversations.openDirect('bob')
  await flushPromises()
  return { server, alice, bob, conversationId }
}

describe('call store', () => {
  it('starts a call: asks for camera + mic, creates the call and joins it', async () => {
    const { server, alice, conversationId } = await setupDirectChat()

    await alice.call.startCall(alice.conversations.byId[conversationId], 'video')
    await flushPromises()

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: true, video: expect.any(Object) }),
    )
    expect(alice.call.status).toBe('connected')
    expect(alice.call.localStream.getVideoTracks()).toHaveLength(1)
    expect(server.db.conversations.get(conversationId).activeCall).toMatchObject({
      kind: 'video',
      startedBy: 'alice',
    })
  })

  it('rings for the other person, but not for the caller', async () => {
    const { alice, bob, conversationId } = await setupDirectChat()

    await alice.call.startCall(alice.conversations.byId[conversationId], 'audio')
    await flushPromises()

    expect(alice.call.incomingCall).toBeNull()
    expect(bob.call.incomingCall).toMatchObject({ kind: 'audio', startedBy: 'alice' })
  })

  it('stops ringing for calls that started too long ago', async () => {
    const { alice, bob, conversationId } = await setupDirectChat()
    await alice.call.startCall(alice.conversations.byId[conversationId], 'audio')
    await flushPromises()

    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + RING_DURATION_MS + 1)
    bob.conversations.list = [...bob.conversations.list] // re-evaluate

    expect(bob.call.incomingCall).toBeNull()
  })

  it('connects both people when the call is accepted', async () => {
    const { alice, bob, conversationId } = await setupDirectChat()
    await alice.call.startCall(alice.conversations.byId[conversationId], 'video')
    await flushPromises()

    await bob.call.joinCall(bob.call.incomingCall.conversation)

    await vi.waitFor(() => {
      expect(alice.call.remoteStreams.bob).toBe(bob.call.localStream)
      expect(bob.call.remoteStreams.alice).toBe(alice.call.localStream)
    })
  })

  it('ends a 1:1 call for both people when one hangs up', async () => {
    const { server, alice, bob, conversationId } = await setupDirectChat()
    await alice.call.startCall(alice.conversations.byId[conversationId], 'video')
    await flushPromises()
    await bob.call.joinCall(bob.call.incomingCall.conversation)
    await flushPromises()
    const aliceStream = alice.call.localStream

    await bob.call.hangUp()

    await vi.waitFor(() => expect(alice.call.status).toBe('idle'))
    expect(aliceStream.getTracks().every((track) => track.readyState === 'ended')).toBe(true)
    expect(server.db.conversations.get(conversationId).activeCall).toBeNull()
  })

  it('declining a 1:1 call ends it for the caller', async () => {
    const { alice, bob, conversationId } = await setupDirectChat()
    await alice.call.startCall(alice.conversations.byId[conversationId], 'audio')
    await flushPromises()

    await bob.call.decline(bob.call.incomingCall)

    await vi.waitFor(() => expect(alice.call.status).toBe('idle'))
    expect(bob.call.incomingCall).toBeNull()
  })

  it('declining a group call only stops the ringing', async () => {
    const server = createFakeServer()
    const alice = await signIn(server, ALICE)
    const bob = await signIn(server, BOB)
    await signIn(server, CAROL)
    const groupId = await alice.conversations.createGroup('Team', ['bob', 'carol'])
    await flushPromises()
    await alice.call.startCall(alice.conversations.byId[groupId], 'video')
    await flushPromises()

    await bob.call.decline(bob.call.incomingCall)
    await flushPromises()

    expect(bob.call.incomingCall).toBeNull()
    expect(alice.call.status).toBe('connected')
    expect(server.db.conversations.get(groupId).activeCall).not.toBeNull()
  })

  it('does not create a call when camera/mic permission is denied', async () => {
    const { server, alice, conversationId } = await setupDirectChat()
    navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(permissionDeniedError())
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await alice.call.startCall(alice.conversations.byId[conversationId], 'video')

    expect(alice.call.status).toBe('idle')
    expect(alice.call.error).toMatch(/permission/i)
    expect(server.db.calls.size).toBe(0)
  })

  it('mutes the microphone and turns the camera off', async () => {
    const { alice, conversationId } = await setupDirectChat()
    await alice.call.startCall(alice.conversations.byId[conversationId], 'video')
    const [audio] = alice.call.localStream.getAudioTracks()
    const [video] = alice.call.localStream.getVideoTracks()

    alice.call.toggleMic()
    alice.call.toggleCamera()

    expect(alice.call.isMicOn).toBe(false)
    expect(alice.call.isCameraOn).toBe(false)
    expect(audio.enabled).toBe(false)
    expect(video.enabled).toBe(false)
  })
})
