import { describe, expect, it } from 'vitest'
import { getIceServers } from '@/webrtc/iceServers'
import { describeMediaError, getLocalMedia, setTracksEnabled, stopMedia } from '@/webrtc/media'
import { FakeMediaStream, FakeMediaStreamTrack } from '@tests/support/fakeWebRTC'

describe('getLocalMedia', () => {
  it('asks for microphone only in voice calls', async () => {
    await getLocalMedia('audio')
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true, video: false })
  })

  it('asks for microphone and camera in video calls', async () => {
    const stream = await getLocalMedia('video')
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: true,
      video: expect.any(Object),
    })
    expect(stream.getVideoTracks()).toHaveLength(1)
  })

  it('rejects with NotSupportedError when the browser has no media devices', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
    await expect(getLocalMedia('audio')).rejects.toMatchObject({ name: 'NotSupportedError' })
  })
})

describe('track helpers', () => {
  it('stops every track of a stream', () => {
    const stream = new FakeMediaStream([new FakeMediaStreamTrack('audio')])
    stopMedia(stream)
    expect(stream.getTracks()[0].readyState).toBe('ended')
  })

  it('enables and disables tracks', () => {
    const tracks = [new FakeMediaStreamTrack('audio')]
    setTracksEnabled(tracks, false)
    expect(tracks[0].enabled).toBe(false)
  })
})

describe('describeMediaError', () => {
  it.each([
    ['NotAllowedError', /permission/i],
    ['NotFoundError', /no camera or microphone/i],
    ['NotReadableError', /another app/i],
    ['SomethingElse', /could not start the call/i],
  ])('explains %s', (name, message) => {
    expect(describeMediaError({ name })).toMatch(message)
  })
})

describe('getIceServers', () => {
  it('uses public STUN servers by default', () => {
    expect(getIceServers({})).toEqual([
      { urls: expect.arrayContaining([expect.stringMatching(/^stun:/)]) },
    ])
  })

  it('adds a TURN server when configured', () => {
    const servers = getIceServers({
      VITE_TURN_URL: 'turn:turn.example.com:3478',
      VITE_TURN_USERNAME: 'user',
      VITE_TURN_CREDENTIAL: 'secret',
    })
    expect(servers).toContainEqual({
      urls: 'turn:turn.example.com:3478',
      username: 'user',
      credential: 'secret',
    })
  })
})
