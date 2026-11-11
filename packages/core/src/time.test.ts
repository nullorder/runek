import { describe, expect, it } from 'vitest'
import {
  clockHours,
  currentHours,
  parseClockTime,
  resolveWorldTime,
  sunState,
  type WorldTime,
} from './time'

describe('parseClockTime', () => {
  it('parses HH:MM into fractional hours', () => {
    expect(parseClockTime('00:00')).toBe(0)
    expect(parseClockTime('06:30')).toBe(6.5)
    expect(parseClockTime('18:45')).toBeCloseTo(18.75)
    expect(parseClockTime('23:59')).toBeCloseTo(23 + 59 / 60)
  })

  it('rejects malformed or out-of-range input', () => {
    for (const bad of ['', '6pm', '24:00', '12:60', '-1:00', '12', '12:5']) {
      expect(parseClockTime(bad)).toBeNull()
    }
  })
})

describe('resolveWorldTime', () => {
  it('pins a valid time (deterministic, not live)', () => {
    expect(resolveWorldTime({ time: '18:30' })).toEqual({ hours: 18.5, live: false })
  })

  it('carries the timezone onto a pinned time', () => {
    expect(resolveWorldTime({ time: '09:00', timezone: 'Asia/Kolkata' })).toEqual({
      hours: 9,
      live: false,
      timezone: 'Asia/Kolkata',
    })
  })

  it('falls through to a live clock when time is absent or malformed', () => {
    expect(resolveWorldTime({}).live).toBe(true)
    expect(resolveWorldTime({ time: 'noon' }).live).toBe(true)
    const live = resolveWorldTime({ timezone: 'UTC' })
    expect(live.live).toBe(true)
    expect(live.timezone).toBe('UTC')
    expect(live.hours).toBeGreaterThanOrEqual(0)
    expect(live.hours).toBeLessThan(24)
  })

  it('snapshots a live clock at the given instant', () => {
    expect(resolveWorldTime({ timezone: 'UTC' }, Date.UTC(2026, 0, 1, 21, 0)).hours).toBe(21)
  })
})

describe('clockHours', () => {
  const at = Date.UTC(2026, 10, 10, 18, 30)

  it('reads the given instant, not the system clock', () => {
    expect(clockHours('UTC', at)).toBe(18.5)
    expect(clockHours('Asia/Kolkata', at)).toBe(0)
  })

  it('falls back to UTC for an unusable zone', () => {
    expect(clockHours('Not/AZone', at)).toBe(18.5)
  })
})

describe('currentHours', () => {
  it('returns the pinned hours unchanged', () => {
    const pinned: WorldTime = { hours: 7.25, live: false }
    expect(currentHours(pinned)).toBe(7.25)
  })

  it('reads a live clock at the given instant', () => {
    const live: WorldTime = { hours: 0, live: true, timezone: 'UTC' }
    expect(currentHours(live, Date.UTC(2026, 0, 1, 6, 15))).toBe(6.25)
  })

  it('reads a live clock within range', () => {
    const h = currentHours({ hours: 0, live: true, timezone: 'UTC' })
    expect(h).toBeGreaterThanOrEqual(0)
    expect(h).toBeLessThan(24)
  })
})

describe('sunState', () => {
  it('puts the sun overhead at noon', () => {
    const noon = sunState(12)
    expect(noon.day).toBe(true)
    expect(noon.elevation).toBeCloseTo(1)
    expect(noon.position[1]).toBeGreaterThan(0)
  })

  it('sits the sun on the horizon at sunrise and sunset', () => {
    expect(sunState(6).elevation).toBeCloseTo(0)
    expect(sunState(18).elevation).toBeCloseTo(0)
  })

  it('drops the sun below the horizon at night', () => {
    const midnight = sunState(0)
    expect(midnight.day).toBe(false)
    expect(midnight.elevation).toBe(0)
    expect(midnight.position[1]).toBeLessThan(0)
  })

  it('sweeps the sun east→west across the day', () => {
    // x runs from +radius at sunrise to -radius at sunset.
    expect(sunState(6).position[0]).toBeGreaterThan(sunState(18).position[0])
  })
})
