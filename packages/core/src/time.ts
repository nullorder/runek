import type { Vec3 } from './types'

/**
 * A world's resolved time-of-day, the value day/night-aware components (`Sky`,
 * `LightRig`, `Clock`) read from `useWorld()`. A world pins a fixed `time`
 * ("HH:MM", reproducible) or tracks a live `timezone`; either way it lands here.
 */
export interface WorldTime {
  /** Fractional hours in [0, 24). For a live world this is a snapshot at resolve
   *  time; call `currentHours()` for the up-to-date value each frame. */
  hours: number
  /** True when the time tracks a live clock (`timezone` or system), false when pinned. */
  live: boolean
  /** IANA zone in effect, if any. Drives live reads and `Clock`'s default timezone. */
  timezone?: string
}

/** A neutral, pinned midday — the default when a world declares no time. Renders
 *  as bright day, so a world that opts out of day/night looks unchanged. */
export const DEFAULT_WORLD_TIME: WorldTime = { hours: 12, live: false }

/** Parse "HH:MM" (24-hour) into fractional hours in [0, 24), or null if malformed. */
export function parseClockTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return h + m / 60
}

/** Read the current fractional hours-of-day in `timezone` (or the local system
 *  clock when omitted), falling back to UTC if the zone is unusable. */
export function clockHours(timezone?: string): number {
  const now = new Date()
  if (timezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(now)
      const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
      const h = get('hour') % 24
      const m = get('minute')
      if (Number.isFinite(h) && Number.isFinite(m)) return h + m / 60
    } catch {
      // fall through to UTC
    }
    return now.getUTCHours() + now.getUTCMinutes() / 60
  }
  const h = now.getHours()
  const m = now.getMinutes()
  if (Number.isFinite(h) && Number.isFinite(m)) return h + m / 60
  return now.getUTCHours() + now.getUTCMinutes() / 60
}

/**
 * Resolve a world's `time`/`timezone` fields into a `WorldTime`. Precedence: a
 * valid pinned `time` wins (deterministic); else a live clock in `timezone`; else
 * the local system clock; else UTC. A malformed `time` is ignored, not fatal.
 */
export function resolveWorldTime(opts: { time?: string; timezone?: string }): WorldTime {
  if (opts.time !== undefined) {
    const hours = parseClockTime(opts.time)
    if (hours !== null) return { hours, live: false, timezone: opts.timezone }
  }
  return { hours: clockHours(opts.timezone), live: true, timezone: opts.timezone }
}

/** The fractional hours for a `WorldTime` right now: constant when pinned, the
 *  live clock when not. Components call this each frame for a live world. */
export function currentHours(time: WorldTime): number {
  return time.live ? clockHours(time.timezone) : time.hours
}

/** Where the sun sits for a given time-of-day, shared by `Sky` and `LightRig` so
 *  the sky's bright spot and the cast shadows always agree. */
export interface SunState {
  /** Direction to the sun, usable directly as a `sunPosition`. Dips below the
   *  ground plane (`position[1] < 0`) at night. */
  position: Vec3
  /** 0 at or below the horizon, rising to 1 at the zenith. */
  elevation: number
  /** Whether the sun is above the horizon. */
  day: boolean
}

/**
 * A simple time-of-day → sun position curve. The sun rises at 06:00, peaks at
 * noon, sets at 18:00, and sits below the horizon overnight. This is a
 * latitude/date-free model (azimuth is a plain east→west sweep); accurate solar
 * position is deliberately out of scope (see the v0.8.0 spec).
 */
export function sunState(hours: number, radius = 100): SunState {
  // theta: 0 at sunrise (06:00), PI at sunset (18:00), negative overnight.
  const theta = ((hours - 6) / 12) * Math.PI
  const sinEl = Math.sin(theta)
  const elevation = Math.max(0, sinEl)
  // East→west sweep along x; height along y; a constant z tilt keeps shadows off-axis.
  const x = Math.cos(theta)
  const y = sinEl
  const z = 0.3
  const len = Math.hypot(x, y, z) || 1
  return {
    position: [(x / len) * radius, (y / len) * radius, (z / len) * radius],
    elevation,
    day: sinEl > 0,
  }
}
