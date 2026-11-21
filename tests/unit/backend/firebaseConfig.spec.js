import { describe, expect, it } from 'vitest'
import { EMULATOR_CONFIG, readFirebaseConfig } from '@/backend/firebase/app'

const ENV = {
  VITE_FIREBASE_API_KEY: 'key',
  VITE_FIREBASE_AUTH_DOMAIN: 'quik.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'quik',
  VITE_FIREBASE_APP_ID: 'app',
}

describe('readFirebaseConfig', () => {
  it('reads the Firebase config from env variables', () => {
    expect(readFirebaseConfig(ENV)).toEqual({
      apiKey: 'key',
      authDomain: 'quik.firebaseapp.com',
      projectId: 'quik',
      appId: 'app',
    })
  })

  it('names the missing variables', () => {
    expect(() =>
      readFirebaseConfig({ ...ENV, VITE_FIREBASE_API_KEY: '', VITE_FIREBASE_APP_ID: '' }),
    ).toThrow('Missing Firebase config: apiKey, appId')
  })

  it('needs no config when running against the local emulators', () => {
    expect(readFirebaseConfig({ VITE_USE_FIREBASE_EMULATORS: 'true' })).toBe(EMULATOR_CONFIG)
  })
})
