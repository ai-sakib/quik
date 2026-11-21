import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth'
import { useCallStore } from '@/stores/call'
import { useConversationsStore } from '@/stores/conversations'
import { ALICE, BOB, CAROL, createFakeServer } from '@tests/support/fakeBackend'
import { FakeRTCPeerConnection } from '@tests/support/fakeWebRTC'
import { createStoreContext } from '@tests/support/render'

/**
 * Group calls use a mesh: everybody connects directly to everybody else.
 * Each person below runs the real stores + WebRTC logic on their own "device";
 * only the network (fake backend) and the browser APIs (fake WebRTC) are simulated.
 */
async function signIn(server, account) {
  const pinia = createStoreContext(server.connect(account, { signedIn: true }))
  await useAuthStore(pinia).init()
  const conversations = useConversationsStore(pinia)
  conversations.start()
  await flushPromises()
  return { id: account.id, conversations, call: useCallStore(pinia) }
}

const remoteIds = (person) => Object.keys(person.call.remoteStreams).sort()

describe('Group calls', () => {
  it('connects everyone to everyone, and keeps going when someone leaves', async () => {
    const server = createFakeServer()
    const [alice, bob, carol] = await Promise.all([ALICE, BOB, CAROL].map((a) => signIn(server, a)))
    const groupId = await alice.conversations.createGroup('Team', ['bob', 'carol'])
    await flushPromises()
    const group = (person) => person.conversations.byId[groupId]

    // Alice starts a video call, Bob and Carol join
    await alice.call.startCall(group(alice), 'video')
    await flushPromises()
    await bob.call.joinCall(group(bob))
    await carol.call.joinCall(group(carol))

    await vi.waitFor(() => {
      expect(remoteIds(alice)).toEqual(['bob', 'carol'])
      expect(remoteIds(bob)).toEqual(['alice', 'carol'])
      expect(remoteIds(carol)).toEqual(['alice', 'bob'])
    })
    expect(carol.call.remoteStreams.bob).toBe(bob.call.localStream)
    expect(FakeRTCPeerConnection.instances).toHaveLength(6) // 3 pairs × 2 ends

    // Carol leaves – Alice and Bob stay connected
    await carol.call.hangUp()
    await vi.waitFor(() => {
      expect(remoteIds(alice)).toEqual(['bob'])
      expect(remoteIds(bob)).toEqual(['alice'])
    })
    expect(server.db.conversations.get(groupId).activeCall).not.toBeNull()

    // Carol can re-join the running call
    await carol.call.joinCall(group(carol))
    await vi.waitFor(() => expect(remoteIds(carol)).toEqual(['alice', 'bob']))

    // When the last person leaves, the call is over
    await Promise.all([alice, bob, carol].map((person) => person.call.hangUp()))
    await flushPromises()
    expect(server.db.conversations.get(groupId).activeCall).toBeNull()
    expect([...server.db.calls.values()][0].status).toBe('ended')
  })

  it('rings everyone in the group except the caller', async () => {
    const server = createFakeServer()
    const [alice, bob, carol] = await Promise.all([ALICE, BOB, CAROL].map((a) => signIn(server, a)))
    const groupId = await alice.conversations.createGroup('Team', ['bob', 'carol'])
    await flushPromises()

    await alice.call.startCall(alice.conversations.byId[groupId], 'audio')
    await flushPromises()

    expect(alice.call.incomingCall).toBeNull()
    expect(bob.call.incomingCall).toMatchObject({ startedBy: 'alice', kind: 'audio' })
    expect(carol.call.incomingCall).toMatchObject({ startedBy: 'alice', kind: 'audio' })
  })
})
