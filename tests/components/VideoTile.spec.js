import { render, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import VideoTile from '@/components/call/VideoTile.vue'
import { FakeMediaStream } from '@tests/support/fakeWebRTC'

describe('VideoTile', () => {
  it('plays the stream in a video element', () => {
    const stream = new FakeMediaStream()
    const { container } = render(VideoTile, { props: { stream, name: 'Bob Brown' } })

    const video = container.querySelector('video')
    expect(video.srcObject).toBe(stream)
    expect(video.muted).toBe(false)
    expect(screen.getByText('Bob Brown')).toBeInTheDocument()
  })

  it('mutes and mirrors our own camera', () => {
    const { container } = render(VideoTile, {
      props: { stream: new FakeMediaStream(), name: 'You', isLocal: true },
    })
    const video = container.querySelector('video')
    expect(video.muted).toBe(true)
    expect(video).toHaveClass('-scale-x-100')
  })

  it('shows the avatar instead of video in voice calls (audio keeps playing)', () => {
    const { container } = render(VideoTile, {
      props: { stream: new FakeMediaStream(), name: 'Bob Brown', showVideo: false },
    })
    expect(container.querySelector('video')).toHaveClass('hidden')
    expect(screen.getByRole('img', { name: 'Bob Brown' })).toHaveTextContent('BB')
  })
})
