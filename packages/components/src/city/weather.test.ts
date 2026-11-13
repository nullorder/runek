import { describe, expect, it } from 'vitest'
import { makeWeather, parseWeatherKind, steadyWeather, WEATHER_KINDS, weatherAt } from './weather'

describe('weatherAt', () => {
  it('is a pure function of the clock', () => {
    const t = Date.UTC(2026, 10, 13, 21, 30)
    expect(weatherAt(t)).toEqual(weatherAt(t))
    expect(weatherAt(t, makeWeather())).toEqual(weatherAt(t))
  })

  it('stays in range over a day', () => {
    const start = Date.UTC(2026, 0, 1)
    for (let m = 0; m < 24 * 60; m += 7) {
      const w = weatherAt(start + m * 60_000)
      expect(WEATHER_KINDS).toContain(w.kind)
      for (const v of [w.rain, w.snow, w.wetness]) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })

  it('eases from one spell to the next instead of jumping', () => {
    const start = Date.UTC(2026, 0, 1)
    let last = weatherAt(start)
    for (let s = 1; s < 6 * 3600; s += 2) {
      const w = weatherAt(start + s * 1000)
      expect(Math.abs(w.rain - last.rain)).toBeLessThan(0.2)
      last = w
    }
  })
})

describe('steadyWeather and parseWeatherKind', () => {
  it('holds one kind', () => {
    expect(steadyWeather('heavy-rain', 0).kind).toBe('heavy-rain')
    expect(steadyWeather('dry', 0).rain).toBe(0)
  })

  it('reads a kind and its short names', () => {
    expect(parseWeatherKind('snow')).toBe('snow')
    expect(parseWeatherKind('storm')).toBe('heavy-rain')
    expect(parseWeatherKind('fog')).toBeNull()
  })
})
