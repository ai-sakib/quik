import { screen, within } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { ALICE, BOB, CAROL, createFakeServer } from '@tests/support/fakeBackend'
import { renderApp } from '@tests/support/render'

/** Opens the app in a separate "browser" for each account, all on the same server. */
async function openApps(server, ...accounts) {
  accounts.forEach(server.saveUser)
  return Promise.all(
    accounts.map(async (account) => {
      const app = await renderApp({ backend: server.connect(account, { signedIn: true }) })
      return { ...app, screen: within(app.container) }
    }),
  )
}

async function sendMessage(app, text) {
  await app.user.type(app.screen.getByLabelText('Message'), `${text}{Enter}`)
}

describe('Chatting', () => {
  it('Alice starts a 1:1 chat with Bob and they talk', async () => {
    const [alice, bob] = await openApps(createFakeServer(), ALICE, BOB)

    // Alice starts the chat
    await alice.user.click(alice.screen.getByRole('button', { name: 'New conversation' }))
    await alice.user.click(await screen.findByRole('checkbox', { name: /Bob Brown/ }))
    await alice.user.click(screen.getByRole('button', { name: 'Start chat' }))
    expect(await alice.screen.findByRole('heading', { name: 'Bob Brown' })).toBeInTheDocument()

    await sendMessage(alice, 'Hi Bob! 👋')

    // Bob sees the new conversation with a preview, and opens it
    const bobsChat = await bob.screen.findByRole('link', { name: /Alice Anderson/ })
    expect(bobsChat).toHaveTextContent('Hi Bob! 👋')
    await bob.user.click(bobsChat)
    const bobsMessages = await bob.screen.findByRole('list', { name: 'Messages' })
    expect(within(bobsMessages).getByText('Hi Bob! 👋')).toBeInTheDocument()

    // Bob replies, Alice sees it
    await sendMessage(bob, 'Hey Alice!')
    const alicesMessages = alice.screen.getByRole('list', { name: 'Messages' })
    expect(await within(alicesMessages).findByText('Hey Alice!')).toBeInTheDocument()
    expect(alice.screen.getByRole('link', { name: /Bob Brown/ })).toHaveTextContent('Hey Alice!')
  })

  it('Alice creates a group and everyone can talk in it', async () => {
    const server = createFakeServer()
    const [alice, carol] = await openApps(server, ALICE, CAROL)
    server.saveUser(BOB)

    await alice.user.click(alice.screen.getByRole('button', { name: 'New conversation' }))
    await alice.user.click(await screen.findByRole('checkbox', { name: /Bob Brown/ }))
    await alice.user.click(screen.getByRole('checkbox', { name: /Carol Clark/ }))
    await alice.user.type(screen.getByLabelText('Group name'), 'Weekend plans')
    await alice.user.click(screen.getByRole('button', { name: /Create group/ }))

    expect(await alice.screen.findByRole('heading', { name: 'Weekend plans' })).toBeInTheDocument()
    expect(alice.screen.getByText('You, Bob, Carol')).toBeInTheDocument()
    await sendMessage(alice, 'Picnic on Saturday?')

    // Carol gets the group and replies
    await carol.user.click(await carol.screen.findByRole('link', { name: /Weekend plans/ }))
    await carol.screen.findByText('Picnic on Saturday?')
    expect(carol.screen.getByText('Alice Anderson')).toBeInTheDocument() // sender name in groups
    await sendMessage(carol, 'Count me in!')

    // Alice sees Carol's reply, labelled with her name
    expect(await alice.screen.findByText('Count me in!')).toBeInTheDocument()
    expect(alice.screen.getByText('Carol Clark')).toBeInTheDocument()
    expect(alice.screen.getByRole('link', { name: /Weekend plans/ })).toHaveTextContent(
      'Carol: Count me in!',
    )
  })
})
