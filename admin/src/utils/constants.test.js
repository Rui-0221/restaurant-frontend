import { describe, expect, it } from 'vitest'
import { formatTime } from './constants'

describe('formatTime', () => {
  it('formats an operations timestamp with the Chinese locale', () => {
    expect(formatTime('2026-08-24T12:34:56')).toBe('2026/08/24 12:34:56')
  })

  it('uses a safe fallback for an invalid operations timestamp', () => {
    expect(formatTime('not-a-date')).toBe('-')
  })
})
