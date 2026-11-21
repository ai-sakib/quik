import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { ALICE, BOB, CAROL } from '@tests/support/fakeBackend'
import { resetEmulators, signInAs, waitForValue } from './support'

beforeEach(resetEmulators)
afterAll(resetEmulators)

const conversationsOf = (person, predicate) =>
  waitForValue(
    (callback) => person.backend.conversations.subscribeForUser(person.id, callback),
    predicate,
  )

describe('Firebase backend', () => {
  it('saves profiles so people can find each other', async () => {
    const alice = await signInAs(ALICE)
    const bob = await signInAs(BOB)

    await alice.backend.users.saveProfile(alice.profile)
    await bob.backend.users.saveProfile(bob.profile)

    const users = await waitForValue(alice.backend.users.subscribe, (list) => list.length === 2)
    expect(users).toEqual(expect.arrayContaining([alice.profile, bob.profile]))
  })

  it('keeps exactly one 1:1 conversation per pair and delivers messages', async () => {
    const alice = await signInAs(ALICE)
    const bob = await signInAs(BOB)

    const conversationId = await alice.backend.conversations.openDirect(alice.id, bob.id)
    expect(await bob.backend.conversations.openDirect(bob.id, alice.id)).toBe(conversationId)

    await alice.backend.messages.send(conversationId, { senderId: alice.id, text: 'Hi Bob' })

    const messages = await waitForValue(
      (callback) => bob.backend.messages.subscribe(conversationId, callback),
      (list) => list.length === 1,
    )
    expect(messages[0]).toMatchObject({
      senderId: alice.id,
      text: 'Hi Bob',
      sentAt: expect.any(Number),
    })

    const [conversation] = await conversationsOf(bob, (list) => list[0]?.lastMessage)
    expect(conversation).toMatchObject({
      id: conversationId,
      type: 'direct',
      memberIds: [alice.id, bob.id].sort(),
      lastMessage: { senderId: alice.id, text: 'Hi Bob' },
    })
  })

  it('creates group conversations', async () => {
    const alice = await signInAs(ALICE)
    const bob = await signInAs(BOB)
    const carol = await signInAs(CAROL)

    const groupId = await alice.backend.conversations.createGroup({
      name: '  Team  ',
      memberIds: [alice.id, bob.id, carol.id],
      createdBy: alice.id,
    })

    const [group] = await conversationsOf(carol, (list) => list.length === 1)
    expect(group).toMatchObject({ id: groupId, type: 'group', name: 'Team' })
    expect(group.memberIds).toHaveLength(3)
  })

  it('runs a call: ring, join, exchange signals, end when everyone has left', async () => {
    const alice = await signInAs(ALICE)
    const bob = await signInAs(BOB)
    await alice.backend.conversations.openDirect(alice.id, bob.id)
    const [conversation] = await conversationsOf(alice, (list) => list.length === 1)

    // Alice starts the call; Bob's conversation shows it
    const callId = await alice.backend.calls.start({
      conversation,
      kind: 'video',
      startedBy: alice.id,
    })
    const [bobsView] = await conversationsOf(bob, (list) => list[0]?.activeCall)
    expect(bobsView.activeCall).toMatchObject({ id: callId, kind: 'video', startedBy: alice.id })

    // Both join; Alice is told when Bob joins and leaves
    const aliceChannel = await alice.backend.calls.join(callId, alice.id)
    const events = []
    aliceChannel.subscribeParticipants({
      onJoin: (participant) => events.push(['join', participant]),
      onLeave: (participant) => events.push(['leave', participant]),
    })
    const bobChannel = await bob.backend.calls.join(callId, bob.id)
    const bobAsParticipant = { userId: bob.id, sessionId: bobChannel.sessionId }
    await expect.poll(() => events).toContainEqual(['join', bobAsParticipant])

    // A signal reaches exactly the session it was sent to
    const received = new Promise((resolve) => bobChannel.subscribeSignals(resolve))
    await aliceChannel.send(bobAsParticipant, {
      type: 'offer',
      description: { type: 'offer', sdp: 'v=0' },
    })
    expect(await received).toEqual({
      from: { userId: alice.id, sessionId: aliceChannel.sessionId },
      type: 'offer',
      description: { type: 'offer', sdp: 'v=0' },
      candidate: null,
    })

    // Bob leaves, then Alice: the call is over
    await bobChannel.leave()
    await expect.poll(() => events).toContainEqual(['leave', bobAsParticipant])
    await aliceChannel.leave()

    const call = await waitForValue(
      (callback) => alice.backend.calls.subscribe(callId, callback),
      (value) => value.status === 'ended',
    )
    expect(call).toMatchObject({ id: callId, status: 'ended', kind: 'video' })
    await conversationsOf(bob, (list) => list[0]?.activeCall === null)
  })

  it('ends a call for everyone (hang up or decline in a 1:1 call)', async () => {
    const alice = await signInAs(ALICE)
    const bob = await signInAs(BOB)
    await alice.backend.conversations.openDirect(alice.id, bob.id)
    const [conversation] = await conversationsOf(alice, (list) => list.length === 1)
    const callId = await alice.backend.calls.start({
      conversation,
      kind: 'audio',
      startedBy: alice.id,
    })
    await alice.backend.calls.join(callId, alice.id)

    await bob.backend.calls.end(callId)

    await waitForValue(
      (callback) => alice.backend.calls.subscribe(callId, callback),
      (call) => call.status === 'ended',
    )
    await conversationsOf(alice, (list) => list[0]?.activeCall === null)
  })
})
