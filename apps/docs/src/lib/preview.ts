// Per-component preview tuning, keyed by component name (PascalCase = registry key).
// Most components look right with the defaults; only overrides live here.
export type PreviewConfig = {
  /** Camera position for the preview. */
  camera?: [number, number, number]
  /** OrbitControls target. */
  target?: [number, number, number]
  /** Extra props passed to the component (merged over `{ seed }`). */
  props?: Record<string, unknown>
  /** Non-visual system component — show a note instead of a canvas. */
  skip?: boolean
  note?: string
}

export const DEFAULT_CAMERA: [number, number, number] = [3.4, 2.6, 4.4]
export const DEFAULT_TARGET: [number, number, number] = [0, 0.9, 0]

/** Components whose geometry visibly changes with `seed` — these get the re-roll control. */
export const SEEDED = new Set([
  'Bookshelf',
  'Bush',
  'Crate',
  'Flowers',
  'Grass',
  'Hedge',
  'Path',
  'Plant',
  'Rocks',
  'Rug',
  'Terrain',
  'Trees',
])

export const PREVIEW: Record<string, PreviewConfig> = {
  // Empty by default now; show the decorative fill variant in the gallery.
  Bookshelf: { props: { fill: 0.7 } },
  Clock: { camera: [0, 0, 2.4], target: [0, 0, 0] },
  Sign: {
    camera: [0, 0, 3],
    target: [0, 0, 0],
    props: { children: 'Runek', size: 0.8, color: '#3df58a', glow: true },
  },
  Player: { skip: true, note: 'First-person controller — drop it into a world to walk.' },
  LightRig: { skip: true, note: 'Lighting system — lights a whole scene rather than an object.' },
  Sky: { camera: [0, 1.5, 7], target: [0, 3, 0] },
  Terrain: { camera: [11, 8, 13], target: [0, 0, 0], props: { size: [30, 30], relief: 1.5 } },
  Lake: { camera: [9, 6, 10], target: [0, 0, 0] },
  Shore: { camera: [8, 5, 9], target: [0, 0, 0] },
  Grass: { camera: [4, 3, 5], target: [0, 0.3, 0] },
  Trees: { camera: [6, 6, 8], target: [0, 3, 0], props: { count: 1 } },
  Rocks: { camera: [6, 4, 7], target: [0, 0.5, 0] },
  Room: { camera: [10, 7, 12], target: [0, 1.5, 0] },
  House: { camera: [11, 7, 13], target: [0, 2, 0] },
  Staircase: { camera: [5, 4.5, 6], target: [0, 1.2, 0] },
  Wall: { camera: [5, 3.5, 6], target: [0, 1.4, 0] },
  Roof: { camera: [6, 4, 7], target: [0, 1, 0] },

  // v0.10.0 catalog expansion
  Fence: { camera: [4, 2.4, 5], target: [0, 0.6, 0] },
  Bridge: { camera: [6, 4, 7.5], target: [0, 0.4, 0] },
  Path: { camera: [4, 6.5, 6], target: [0, 0, 0] },
  Arch: { camera: [4, 3, 5.5], target: [0, 1.4, 0] },
  Pillar: { camera: [3, 3.2, 4], target: [0, 1.5, 0] },
  Bush: { camera: [2.4, 1.8, 2.8], target: [0, 0.4, 0] },
  Flowers: { camera: [4, 3, 5], target: [0, 0.3, 0] },
  Hedge: { camera: [4, 2.6, 5], target: [0, 0.7, 0] },
  Well: { camera: [3.2, 2.8, 3.8], target: [0, 1, 0] },
  Fountain: { camera: [4.5, 3.2, 5], target: [0, 1, 0] },
  Bench: { camera: [3, 2, 3.6], target: [0, 0.5, 0] },
  Bed: { camera: [4, 3.2, 4.6], target: [0, 0.5, 0] },
  Crate: { camera: [2.2, 2, 2.6], target: [0, 0.4, 0] },
  Barrel: { camera: [2, 1.7, 2.4], target: [0, 0.45, 0] },
  Plant: { camera: [1.8, 1.5, 2.2], target: [0, 0.5, 0] },
  Clouds: {
    camera: [0, 3, 11],
    target: [0, 3, 0],
    props: { height: 3, area: [12, 6], count: 4, drift: 0 },
  },
  Campfire: { camera: [2.2, 1.8, 2.6], target: [0, 0.5, 0] },
  Birds: {
    camera: [0, 3.5, 11],
    target: [0, 3.5, 0],
    props: { count: 8, area: 5, height: 3.5, speed: 1.5 },
  },
}
