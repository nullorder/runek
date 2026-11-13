// The weather: what falls, how hard the wind blows and how wet the ground is, as a pure function
// of a clock. Hand `weatherAt` the same Unix time on two machines and both get the same weather,
// so players who share a clock share the sky with nothing sent between them.
//
// Also here, the uniforms `Rain` and `WetStreet` share. `Rain` drives them from the weather it is
// given and the street only listens.
//
// No three.js, React or Runek in this file, so a HUD can import it without pulling in the 3D code.

export type WeatherKind = 'dry' | 'windy' | 'drizzle' | 'light-rain' | 'heavy-rain' | 'snow'

interface WeatherRow {
  /** How likely a spell is to be this kind, against the other rows. Any positive numbers. */
  odds: number
  /** A spell lasts between these, in minutes. Keep the shorter one well above `WEATHER_TIMING.blend`. */
  minutes: readonly [number, number]
  /** How hard it rains, 0 to 1: how many streaks fall, how fast and how long they are, how loud it is. */
  rain: number
  /** How hard it snows, 0 to 1. */
  snow: number
  /** The steady wind is somewhere between these, in units a second. Each spell picks its own speed and heading. */
  wind: readonly [number, number]
  /** How far gusts swing the wind around that speed: 0.4 is 40% either way. */
  gust: number
  /** How wet the ground ends up if the spell lasts, 0 (dry) to 1 (soaked). */
  wet: number
}

/**
 * The tuning table: one row for each kind of weather. Change the mix of weather here.
 *
 * `odds` are relative (these add up to 100, so they read as percentages of spells, not of time:
 * a kind with long spells fills more of the night than its odds say). The same kind never comes
 * twice in a row.
 */
export const WEATHER: Record<WeatherKind, WeatherRow> = {
  dry: { odds: 28, minutes: [5, 12], rain: 0, snow: 0, wind: [0.4, 1.6], gust: 0.3, wet: 0 },
  windy: { odds: 14, minutes: [3, 7], rain: 0, snow: 0, wind: [7, 11], gust: 0.45, wet: 0 },
  drizzle: {
    odds: 16,
    minutes: [4, 9],
    rain: 0.15,
    snow: 0,
    wind: [0.5, 2.5],
    gust: 0.3,
    wet: 0.6,
  },
  'light-rain': {
    odds: 20,
    minutes: [4, 10],
    rain: 0.45,
    snow: 0,
    wind: [1, 3.5],
    gust: 0.35,
    wet: 0.85,
  },
  'heavy-rain': { odds: 12, minutes: [3, 6], rain: 1, snow: 0, wind: [3, 7], gust: 0.5, wet: 1 },
  snow: { odds: 10, minutes: [5, 10], rain: 0, snow: 0.85, wind: [0.5, 2.5], gust: 0.3, wet: 0.5 },
}

/** The clocks behind the table, in seconds unless they say otherwise. */
export const WEATHER_TIMING = {
  /** One spell eases into the next over this long, so nothing pops. */
  blend: 45,
  /** Heavy rain soaks dry ground in about this long. Lighter weather takes longer. */
  soak: 40,
  /** Wet ground loses about two thirds of its water in this long once the rain stops. */
  dry: 480,
  /** The same in a wind, which dries a street faster. */
  dryWindy: 200,
  /** How far back the ground remembers, in minutes. Several times `dry`, or wetness steps. */
  memoryMinutes: 40,
  /** The schedule is dealt in blocks this long, in minutes. A spell never runs across two blocks. */
  blockMinutes: 120,
  /** Changes every spell at once: a different night of weather for the same clock. */
  seed: 2047,
}

export const WEATHER_KINDS = Object.keys(WEATHER) as WeatherKind[]

export interface WeatherState {
  /** The kind of weather this is. Halfway through a change it becomes the new one. */
  kind: WeatherKind
  /** How hard it rains now, 0 to 1. */
  rain: number
  /** How hard it snows now, 0 to 1. */
  snow: number
  /** The wind now, gusts and all, in units a second along x and z. */
  wind: { x: number; z: number }
  /** The length of `wind`. */
  speed: number
  /** How wet the ground is, 0 to 1. It lags the rain: streets stay wet for a while after it stops. */
  wetness: number
}

/** A state to hand to `weatherAt` as `out`, so a caller that asks every frame makes no garbage. */
export function makeWeather(): WeatherState {
  return { kind: 'dry', rain: 0, snow: 0, wind: { x: 0, z: 0 }, speed: 0, wetness: 0 }
}

/** Short names `?weather=` also takes. */
const ALIASES: Record<string, WeatherKind> = {
  clear: 'dry',
  wind: 'windy',
  light: 'light-rain',
  rain: 'light-rain',
  heavy: 'heavy-rain',
  storm: 'heavy-rain',
}

/** The kind a word names, or null when it names none. */
export function parseWeatherKind(word: string | null | undefined): WeatherKind | null {
  if (!word) return null
  const w = word.trim().toLowerCase()
  if (w in WEATHER) return w as WeatherKind
  return ALIASES[w] ?? null
}

// The schedule --------------------------------------------------------------------------------

interface Spell {
  kind: WeatherKind
  /** Unix ms. */
  start: number
  end: number
  rain: number
  snow: number
  /** The steady wind, before gusts. */
  wx: number
  wz: number
  gust: number
  wet: number
  /** Seconds for the ground to take this spell's water up, and to let it go. */
  soak: number
  dry: number
}

const BLOCK_MS = WEATHER_TIMING.blockMinutes * 60_000
const BLEND_MS = WEATHER_TIMING.blend * 1000
const MEMORY_MS = WEATHER_TIMING.memoryMinutes * 60_000
/** A block never ends on a spell shorter than this: the one before runs on to the end instead. */
const SHORTEST_MS = Math.max(
  2 * BLEND_MS,
  Math.min(...WEATHER_KINDS.map((k) => WEATHER[k].minutes[0])) * 60_000,
)

/** A small seeded generator, so the same block deals the same spells on every machine. */
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick(r: () => number, not: WeatherKind | null): WeatherKind {
  let total = 0
  for (const k of WEATHER_KINDS) if (k !== not) total += WEATHER[k].odds
  let at = r() * total
  let last = WEATHER_KINDS[0]
  for (const k of WEATHER_KINDS) {
    if (k === not) continue
    last = k
    at -= WEATHER[k].odds
    if (at < 0) return k
  }
  return last
}

const blocks = new Map<number, Spell[]>()

/** The spells of one block, end to end. Dealt from the block's number alone, so any block can be asked for on its own. */
function spellsOf(block: number): Spell[] {
  const known = blocks.get(block)
  if (known) return known
  const r = seeded(Math.imul(block, 0x9e3779b1) ^ WEATHER_TIMING.seed)
  const from = block * BLOCK_MS
  const spells: Spell[] = []
  let t = 0
  let prev: WeatherKind | null = null
  while (t < BLOCK_MS) {
    const kind = pick(r, prev)
    const row = WEATHER[kind]
    let length = (row.minutes[0] + r() * (row.minutes[1] - row.minutes[0])) * 60_000
    if (BLOCK_MS - (t + length) < SHORTEST_MS) length = BLOCK_MS - t
    const heading = r() * Math.PI * 2
    const speed = row.wind[0] + r() * (row.wind[1] - row.wind[0])
    // No two spells of a kind are quite alike: each falls a little harder or softer than the table says.
    const strength = 0.85 + r() * 0.3
    const rain = Math.min(1, row.rain * strength)
    const snow = Math.min(1, row.snow * strength)
    spells.push({
      kind,
      start: from + t,
      end: from + t + length,
      rain,
      snow,
      wx: Math.cos(heading) * speed,
      wz: Math.sin(heading) * speed,
      gust: row.gust,
      wet: row.wet,
      soak: WEATHER_TIMING.soak / (0.25 + 0.75 * Math.max(rain, snow * 0.3)),
      dry: kind === 'windy' ? WEATHER_TIMING.dryWindy : WEATHER_TIMING.dry,
    })
    t += length
    prev = kind
  }
  if (blocks.size > 6) blocks.clear()
  blocks.set(block, spells)
  return spells
}

// The state at one moment ---------------------------------------------------------------------

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (v: number) => {
  const x = clamp01(v)
  return x * x * (3 - 2 * x)
}
const mix = (a: number, b: number, k: number) => a + (b - a) * k
/** What falls eases out in the first part of a change and in over the last, so rain is nearly gone before snow starts. */
const fall = (from: number, to: number, x: number) =>
  mix(from, to, to < from ? smooth(x / 0.6) : smooth((x - 0.4) / 0.6))

const TURN = Math.PI * 2

/** Lay gusts over a steady wind. Slow sums of sines of the clock, so every player feels the same gust. */
function blow(out: WeatherState, wx: number, wz: number, gust: number, unixMs: number) {
  const t = unixMs / 1000
  const swell =
    0.5 * Math.sin((t * TURN) / 23.1) +
    0.3 * Math.sin((t * TURN) / 9.7 + 1.3) +
    0.2 * Math.sin((t * TURN) / 4.3 + 4.1)
  const veer = 0.6 * gust * Math.sin((t * TURN) / 37 + 2.2)
  const scale = Math.max(0.15, 1 + gust * swell)
  const cos = Math.cos(veer) * scale
  const sin = Math.sin(veer) * scale
  out.wind.x = wx * cos - wz * sin
  out.wind.z = wx * sin + wz * cos
  out.speed = Math.hypot(out.wind.x, out.wind.z)
}

/** Carry the ground's wetness through the spells of one block that fall inside its memory. -1 means nothing yet. */
function soakThrough(spells: Spell[], since: number, now: number, wet: number): number {
  for (const s of spells) {
    if (s.end <= since || s.start > now) continue
    if (wet < 0) wet = s.wet
    const seconds = (Math.min(s.end, now) - Math.max(s.start, since)) / 1000
    wet = s.wet + (wet - s.wet) * Math.exp(-seconds / (s.wet > wet ? s.soak : s.dry))
  }
  return wet
}

/**
 * The weather at a moment, from the clock alone. `unixMs` is Unix time in milliseconds: hand it
 * the clock the players share. Pure: the same time always gives the same weather, whenever and
 * wherever it is asked. Pass `out` to have it filled in place.
 */
export function weatherAt(unixMs: number, out: WeatherState = makeWeather()): WeatherState {
  const block = Math.floor(unixMs / BLOCK_MS)
  const today = spellsOf(block)
  const before = spellsOf(block - 1)
  let i = today.length - 1
  while (i > 0 && today[i].start > unixMs) i--
  const cur = today[i]
  const prev = i > 0 ? today[i - 1] : before[before.length - 1]
  const x = clamp01((unixMs - cur.start) / BLEND_MS)
  const k = smooth(x)
  out.kind = x < 0.5 ? prev.kind : cur.kind
  out.rain = fall(prev.rain, cur.rain, x)
  out.snow = fall(prev.snow, cur.snow, x)
  blow(out, mix(prev.wx, cur.wx, k), mix(prev.wz, cur.wz, k), mix(prev.gust, cur.gust, k), unixMs)
  const since = unixMs - MEMORY_MS
  out.wetness = clamp01(soakThrough(today, since, unixMs, soakThrough(before, since, unixMs, -1)))
  return out
}

/**
 * One kind of weather that never changes, as if its spell had always been: for `?weather=`, tests
 * and screenshots. The wind still gusts with the clock.
 */
export function steadyWeather(
  kind: WeatherKind,
  unixMs: number,
  out: WeatherState = makeWeather(),
): WeatherState {
  const row = WEATHER[kind]
  const speed = (row.wind[0] + row.wind[1]) / 2
  out.kind = kind
  out.rain = row.rain
  out.snow = row.snow
  blow(out, speed * 0.894, speed * 0.447, row.gust, unixMs)
  out.wetness = row.wet
  return out
}

// What `Rain` and `WetStreet` share -----------------------------------------------------------

/**
 * The rain clock wraps to 0 after this many seconds. Every speed and rate that reads the clock
 * is picked so its motion repeats exactly at the wrap, and nothing jumps.
 */
export const RAIN_PERIOD = 160

/**
 * Read by the streaks, splashes and flakes in `Rain` and by every `WetStreet`. With no `Rain`
 * mounted they stay as they are here: no rings, and streets as wet as their own props say.
 */
export const rainUniforms = {
  /** Seconds of weather so far, wrapped at `RAIN_PERIOD`. */
  uRainTime: { value: 0 },
  /** How hard rain rings the puddles, 0 (still water) to 1 (heavy rain). */
  uRain: { value: 0 },
  /** How wet the weather has left the ground, 0 to 1. It scales each street's own `wetness` and `puddles`. */
  uWetness: { value: 1 },
}
