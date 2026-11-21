import { render, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import UserAvatar from '@/components/ui/UserAvatar.vue'

describe('UserAvatar', () => {
  it('shows the profile photo when there is one', () => {
    render(UserAvatar, { props: { name: 'Bob Brown', photoUrl: 'https://example.com/bob.png' } })
    const image = screen.getByRole('img', { name: 'Bob Brown' })
    expect(image).toHaveAttribute('src', 'https://example.com/bob.png')
    // Google profile photos refuse requests that send a referrer.
    expect(image).toHaveAttribute('referrerpolicy', 'no-referrer')
  })

  it('falls back to initials', () => {
    render(UserAvatar, { props: { name: 'Carol Ann Clark' } })
    expect(screen.getByRole('img', { name: 'Carol Ann Clark' })).toHaveTextContent('CA')
  })
})
