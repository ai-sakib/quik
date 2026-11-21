import { describe, expect, it } from 'vitest'
import { formatClockTime, formatShortTime } from '@/utils/time'

const NOW = new Date(2026, 10, 20, 15, 30).getTime() // Fri 20 Nov 2026, 15:30

describe('formatShortTime', () => {
  it('returns an empty string without a timestamp', () => {
    expect(formatShortTime(null, NOW)).toBe('')
  })

  it('shows the time for today', () => {
    const today = new Date(2026, 10, 20, 9, 5).getTime()
    expect(formatShortTime(today, NOW)).toBe(formatClockTime(today))
  })

  it('shows the weekday within the last week', () => {
    const tuesday = new Date(2026, 10, 17, 12, 0).getTime()
    expect(formatShortTime(tuesday, NOW)).toBe(
      new Date(tuesday).toLocaleDateString([], { weekday: 'short' }),
    )
  })

  it('shows the date for anything older', () => {
    const older = new Date(2026, 9, 1).getTime()
    expect(formatShortTime(older, NOW)).toBe(
      new Date(older).toLocaleDateString([], { day: 'numeric', month: 'short' }),
    )
  })
})
