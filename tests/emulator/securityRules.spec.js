import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { directConversationId } from '@/utils/conversations'
import { ALICE, BOB, CAROL } from '@tests/support/fakeBackend'
import { PERMISSION_DENIED, resetEmulators, signInAs } from './support'

beforeEach(async () => {
  await resetEmulators()
  vi.spyOn(console, 'warn').mockImplementation(() => {}) // Firestore logs denied writes
})
afterAll(resetEmulators)

/** Alice and Bob have a 1:1 chat. Carol is not part of it. */
async function setup() {
  const [alice, bob, carol] = await Promise.all([signInAs(ALICE), signInAs(BOB), signInAs(CAROL)])
  const conversationId = await alice.backend.conversations.openDirect(alice.id, bob.id)
  await alice.backend.messages.send(conversationId, { senderId: alice.id, text: 'Secret' })
  return { alice, bob, carol, conversationId }
}

describe('Security rules', () => {
  it('lets everyone read profiles, but only edit their own', async () => {
    const { alice, bob } = await setup()
    await alice.backend.users.saveProfile(alice.profile)

    expect((await getDoc(doc(bob.db, 'users', alice.id))).data()).toMatchObject({
      name: 'Alice Anderson',
    })
    await expect(setDoc(doc(bob.db, 'users', alice.id), { name: 'Hacked' })).rejects.toMatchObject(
      PERMISSION_DENIED,
    )
  })

  it('keeps conversations and messages private to their members', async () => {
    const { carol, conversationId } = await setup()

    await expect(getDoc(doc(carol.db, 'conversations', conversationId))).rejects.toMatchObject(
      PERMISSION_DENIED,
    )
    await expect(
      getDocs(collection(carol.db, 'conversations', conversationId, 'messages')),
    ).rejects.toMatchObject(PERMISSION_DENIED)
    await expect(
      carol.backend.messages.send(conversationId, { senderId: carol.id, text: 'Hi' }),
    ).rejects.toMatchObject(PERMISSION_DENIED)
  })

  it('does not let anyone send messages in someone else’s name', async () => {
    const { alice, bob, conversationId } = await setup()

    await expect(
      bob.backend.messages.send(conversationId, { senderId: alice.id, text: 'Not really Alice' }),
    ).rejects.toMatchObject(PERMISSION_DENIED)
  })

  it('does not let members change who is in a conversation', async () => {
    const { bob, carol, alice, conversationId } = await setup()

    await expect(
      updateDoc(doc(bob.db, 'conversations', conversationId), {
        memberIds: [alice.id, bob.id, carol.id],
      }),
    ).rejects.toMatchObject(PERMISSION_DENIED)
  })

  it('does not let anyone create conversations for other people', async () => {
    const { alice, bob, carol } = await setup()

    await expect(carol.backend.conversations.openDirect(alice.id, bob.id)).rejects.toMatchObject(
      PERMISSION_DENIED,
    )
    await expect(
      carol.backend.conversations.createGroup({
        name: 'Fake group',
        memberIds: [alice.id, bob.id],
        createdBy: alice.id,
      }),
    ).rejects.toMatchObject(PERMISSION_DENIED)
  })

  it('only accepts 1:1 conversation ids that match their members', async () => {
    const { alice, bob, carol } = await setup()
    const wrongId = directConversationId(alice.id, bob.id) // but members are Carol + Bob

    await expect(
      setDoc(doc(carol.db, 'conversations', wrongId), {
        type: 'direct',
        memberIds: [bob.id, carol.id].sort(),
        createdBy: carol.id,
      }),
    ).rejects.toMatchObject(PERMISSION_DENIED)
  })

  it('keeps calls private: outsiders cannot join, start, or read signals', async () => {
    const { alice, bob, carol, conversationId } = await setup()
    const conversation = (await getDoc(doc(alice.db, 'conversations', conversationId))).data()
    const callId = await alice.backend.calls.start({
      conversation: { id: conversationId, ...conversation },
      kind: 'video',
      startedBy: alice.id,
    })
    const bobChannel = await bob.backend.calls.join(callId, bob.id)
    await alice.backend.calls
      .join(callId, alice.id)
      .then((channel) =>
        channel.send({ userId: bob.id, sessionId: bobChannel.sessionId }, { type: 'offer' }),
      )

    await expect(carol.backend.calls.join(callId, carol.id)).rejects.toMatchObject(
      PERMISSION_DENIED,
    )
    await expect(getDoc(doc(carol.db, 'calls', callId))).rejects.toMatchObject(PERMISSION_DENIED)
    await expect(
      getDocs(query(collection(carol.db, 'calls', callId, 'signals'), where('to', '==', bob.id))),
    ).rejects.toMatchObject(PERMISSION_DENIED)
    await expect(
      addDoc(collection(carol.db, 'calls'), {
        conversationId,
        memberIds: conversation.memberIds,
        kind: 'video',
        startedBy: carol.id,
        status: 'active',
      }),
    ).rejects.toMatchObject(PERMISSION_DENIED)
  })

  it('does not let members read signals addressed to someone else', async () => {
    const { alice, bob, conversationId } = await setup()
    const conversation = (await getDoc(doc(alice.db, 'conversations', conversationId))).data()
    const callId = await alice.backend.calls.start({
      conversation: { id: conversationId, ...conversation },
      kind: 'audio',
      startedBy: alice.id,
    })

    await expect(
      getDocs(query(collection(alice.db, 'calls', callId, 'signals'), where('to', '==', bob.id))),
    ).rejects.toMatchObject(PERMISSION_DENIED)
  })
})
