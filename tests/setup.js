import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/vue'
import { afterEach, beforeEach } from 'vitest'
import { installFakeWebRTC } from './support/fakeWebRTC'

beforeEach(() => {
  installFakeWebRTC()
})

afterEach(() => {
  cleanup()
})
