import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import CallControls from '@/components/call/CallControls.vue'

function renderControls(props) {
  const result = render(CallControls, {
    props: { isMicOn: true, isCameraOn: true, ...props },
  })
  return { ...result, user: userEvent.setup() }
}

describe('CallControls', () => {
  it('emits events for mute, camera and hang up', async () => {
    const { user, emitted } = renderControls()

    await user.click(screen.getByRole('button', { name: 'Mute microphone' }))
    await user.click(screen.getByRole('button', { name: 'Turn camera off' }))
    await user.click(screen.getByRole('button', { name: 'Leave call' }))

    expect(emitted()).toHaveProperty('toggle-mic')
    expect(emitted()).toHaveProperty('toggle-camera')
    expect(emitted()).toHaveProperty('hang-up')
  })

  it('reflects muted mic and camera', () => {
    renderControls({ isMicOn: false, isCameraOn: false })

    expect(screen.getByRole('button', { name: 'Unmute microphone' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Turn camera on' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('hides the camera button in voice calls', () => {
    renderControls({ showCameraToggle: false })
    expect(screen.queryByRole('button', { name: /camera/ })).toBeNull()
  })

  it('can be disabled while the call is connecting', () => {
    renderControls({ disabled: true })
    expect(screen.getByRole('button', { name: 'Leave call' })).toBeDisabled()
  })
})
