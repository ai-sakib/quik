const ONE_DAY = 24 * 60 * 60 * 1000

/** "14:05" for today, "Mon" within the last week, otherwise "12 Mar". */
export function formatShortTime(timestamp, now = Date.now()) {
  if (!timestamp) return ''
  const date = new Date(timestamp)

  if (new Date(now).toDateString() === date.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (now - timestamp < 7 * ONE_DAY) {
    return date.toLocaleDateString([], { weekday: 'short' })
  }
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export function formatClockTime(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
