# Quik

A small video/voice calling and chat app built with **Vue 3**, **Tailwind CSS** and **Firebase**, ready to deploy on **Netlify**.

- Sign in with Google (the only sign-in method)
- 1:1 and group chats in real time
- 1:1 and group video and voice calls (WebRTC), with mute and camera toggles
- Incoming call notification, plus a "Join call" button for calls already running

## How it works

Netlify only serves static files, so it can't run a realtime server. **Firebase** fills that gap:

| Need | Solution |
| --- | --- |
| Google sign-in | Firebase Authentication |
| Chat messages, conversation list | Cloud Firestore (realtime listeners) |
| Call signaling (WebRTC offers/answers/ICE candidates) | Cloud Firestore |
| Audio/video | Peer-to-peer WebRTC: media never touches a server |

Group calls use a **mesh**: everyone connects directly to everyone else. It needs no media server and works well for small groups (up to about 6 people).

### Project structure

```
src/
  backend/            Everything that talks to the outside world
    index.js          The backend interface + provide/inject helpers
    firebase/         Firebase implementation (auth, users, conversations, messages, calls, signaling)
  webrtc/             Browser call logic, independent of Firebase
    meshCall.js       Connects to every participant (offer/answer/ICE handling)
    media.js          Camera/microphone helpers
    iceServers.js     STUN (+ optional TURN) config
  stores/             Pinia stores: auth, users, conversations, call
  composables/        useMessages
  components/         UI, grouped by feature (chat, conversations, call, layout, ui)
  views/              Pages: Login, MainLayout, Welcome, Conversation
  router/             Routes + "must be signed in" guard
  utils/              Small pure helpers (titles, previews, time formatting)
tests/
  unit/               Pure logic, WebRTC mesh, stores
  components/         Components rendered on their own
  integration/        The whole app rendered, several users talking to each other
  emulator/           Real Firebase code + security rules against the Firebase emulators
  support/            Fake backend, fake WebRTC, render helpers
```

Components and stores never import Firebase directly. They use the small interface in `src/backend/index.js`, which is provided to the app with Vue's `provide`/`inject`. That is what lets the tests run the real app on an in-memory backend.

### Data model (Firestore)

```
users/{uid}                              name, email, photoURL
conversations/{id}                       type (direct|group), name, memberIds, lastMessage, activeCall
conversations/{id}/messages/{id}         senderId, text, sentAt
calls/{id}                               conversationId, memberIds, kind (audio|video), status
calls/{id}/participants/{uid}            sessionId: who is in the call right now
calls/{id}/signals/{id}                  WebRTC signaling messages between two participants
```

Access is locked down in [`firestore.rules`](firestore.rules). For example, only members can read a conversation, nobody can send messages in someone else's name, and signals can only be read by the person they're addressed to.

## Getting started

Requirements: Node 20.19+ (Netlify uses 22). Running the Firebase emulators also needs Java 21+.

```bash
npm install
```

### Option A: run fully locally (no Firebase project needed)

```bash
npm run emulators        # terminal 1: local Auth + Firestore
npm run dev:emulators    # terminal 2: http://localhost:5173
```

The Auth emulator shows a fake Google account picker. You can add any name or email there, so you can sign in as different people in two browser windows and call yourself.

### Option B: use a real Firebase project

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication → Sign-in method**: enable **Google**.
3. **Firestore Database**: create a database (production mode).
4. **Project settings → Your apps**: add a **Web app** and copy its config.
5. `cp .env.example .env.local` and fill in the `VITE_FIREBASE_*` values.
6. Deploy the security rules and index:
   ```bash
   npx firebase-tools login
   npx firebase-tools deploy --only firestore --project <your-project-id>
   ```
7. `npm run dev`

## Deploying to Netlify

1. Push this folder to a Git repository and import it in Netlify. Build settings come from [`netlify.toml`](netlify.toml): build command `npm run build`, publish directory `dist`, and SPA redirects.
2. **Site configuration → Environment variables**: add the four `VITE_FIREBASE_*` variables (and the optional `VITE_TURN_*` ones). Vite bakes them into the build, so redeploy after changing them.
3. In Firebase **Authentication → Settings → Authorized domains**, add your Netlify domain (e.g. `quik-app.netlify.app`). Google sign-in fails without this.

### About TURN

The app uses Google's public STUN servers, which let most users connect directly. Users behind strict corporate networks or some mobile carriers need a **TURN** relay. If calls connect for some people but not others, add a TURN service (e.g. Metered, Twilio, or your own coturn) through the `VITE_TURN_*` env variables.

## Tests

```bash
npm test                  # unit + component + integration (Vitest, jsdom)
npm run test:unit
npm run test:components
npm run test:integration
npm run test:emulator     # starts the Firebase emulators, tests the real backend + security rules
npm run lint
```

- **Unit**: helpers, the WebRTC mesh logic (offer/answer rules, early ICE candidates, re-joins, leaving) and the Pinia stores.
- **Component**: each component rendered on its own, using Testing Library.
- **Integration**: the whole app (router, stores, views) on an in-memory backend. Several users run side by side: Alice starts a chat and Bob replies; Alice creates a group and Carol answers; Alice video-calls Bob, he accepts and both see each other; three people join a group call, one leaves, everyone hangs up.
- **Emulator**: the real Firebase backend against the local Firestore and Auth emulators, including tests proving the security rules block outsiders.

WebRTC and the camera don't exist in jsdom, so `tests/support/fakeWebRTC.js` provides small fakes that still exchange offers, answers and streams.

## Known limits (kept simple on purpose)

- Mesh calls get heavy with many people. For large groups, use a media server such as LiveKit.
- If a browser crashes during a call, its participant entry stays until the call ends. Others may see "Call in progress" until everyone leaves.
- Signaling documents are not cleaned up. A Firestore [TTL policy](https://firebase.google.com/docs/firestore/ttl) on `signals` can remove them automatically.
- Every signed-in user can see every other user's name and email, which is how you find people to chat with.
