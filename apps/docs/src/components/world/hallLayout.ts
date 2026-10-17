/**
 * Where every exhibit stands in the gallery hall. Pure: given how many exhibits each floor
 * holds, returns the hall's side and one placement per exhibit along its floor's outer wall.
 * All coordinates are local to the hall's center, in units.
 */

export const STOREY = 4.5
/** The atrium cut through every floor above the ground, square. */
export const VOID = 12
export const MIN_SIDE = 28
export const WALL_THICKNESS = 0.2
/** Pedestal center to the wall's inner face. */
export const INSET = 0.85
/** Wall run kept clear at each corner, so neighbouring walls' exhibits never collide. */
const CORNER = 1.7
/** Half the wall run kept clear around a ground-floor doorway. */
const DOOR_GAP = 2.2
const MIN_PITCH = 2.2
const MAX_PITCH = 3.4
const GROW = 2

/** A spot on the floor plan and the turn that faces an exhibit away from its wall. */
export interface Slot {
  x: number
  z: number
  rotation: number
}

interface Segment {
  from: [number, number]
  dir: [number, number]
  length: number
  rotation: number
}

/** The inner face of the outer walls, from the hall's center. */
export const innerHalf = (side: number) => side / 2 - WALL_THICKNESS / 2

/**
 * One loop around the outer walls, starting beside the east (entrance) doorway and heading
 * north, then west, south, and back along the east wall: clockwise from above, so every wall
 * reads left to right as you face it. `doors` opens a gap mid-wall on the east and west sides.
 */
function segments(side: number, doors: boolean): Segment[] {
  const h = innerHalf(side)
  const a = h - INSET
  const e = h - CORNER
  const g = doors ? DOOR_GAP : 0
  const east = -Math.PI / 2
  const west = Math.PI / 2
  return [
    { from: [a, g], dir: [0, 1], length: e - g, rotation: east },
    { from: [e, a], dir: [-1, 0], length: 2 * e, rotation: Math.PI },
    { from: [-a, e], dir: [0, -1], length: e - g, rotation: west },
    { from: [-a, -g], dir: [0, -1], length: e - g, rotation: west },
    { from: [-e, -a], dir: [1, 0], length: 2 * e, rotation: 0 },
    { from: [a, -e], dir: [0, 1], length: e - g, rotation: east },
  ]
}

/** How many exhibits each segment takes, proportional to its length and capped by `pitch`. */
function allocate(count: number, segs: Segment[], pitch: number): number[] {
  const total = segs.reduce((sum, s) => sum + s.length, 0)
  const caps = segs.map((s) => Math.floor(s.length / pitch + 1e-9))
  const ideal = segs.map((s) => (count * s.length) / total)
  const taken = ideal.map((v, i) => Math.min(caps[i], Math.floor(v)))
  let left = count - taken.reduce((sum, n) => sum + n, 0)
  while (left > 0) {
    let best = -1
    for (let i = 0; i < segs.length; i++) {
      if (taken[i] >= caps[i]) continue
      if (best < 0 || ideal[i] - taken[i] > ideal[best] - taken[best]) best = i
    }
    taken[best]++
    left--
  }
  return taken
}

/** Slots for `count` exhibits along `segs`, or null when they don't fit at `MIN_PITCH`. */
function fit(count: number, segs: Segment[]): Slot[] | null {
  if (count === 0) return []
  const total = segs.reduce((sum, s) => sum + s.length, 0)
  const capacity = (p: number) => segs.reduce((sum, s) => sum + Math.floor(s.length / p + 1e-9), 0)
  let pitch = Math.min(MAX_PITCH, total / count)
  while (capacity(pitch) < count) {
    pitch *= 0.98
    if (pitch < MIN_PITCH) return null
  }
  const slots: Slot[] = []
  allocate(count, segs, pitch).forEach((n, i) => {
    if (n === 0) return
    const seg = segs[i]
    const spacing = Math.min(MAX_PITCH, seg.length / n)
    const start = (seg.length - n * spacing) / 2 + spacing / 2
    for (let j = 0; j < n; j++) {
      const t = start + j * spacing
      slots.push({
        x: seg.from[0] + seg.dir[0] * t,
        z: seg.from[1] + seg.dir[1] * t,
        rotation: seg.rotation,
      })
    }
  })
  return slots
}

/**
 * Lay out every floor (index 0 is the ground, with its two doorways). The hall starts at
 * `MIN_SIDE` and widens in steps until the fullest floor fits.
 */
export function layoutHall(counts: number[]): { side: number; floors: Slot[][] } {
  for (let side = MIN_SIDE; ; side += GROW) {
    const floors = counts.map((count, i) => fit(count, segments(side, i === 0)))
    if (floors.every((f) => f !== null)) return { side, floors: floors as Slot[][] }
  }
}
