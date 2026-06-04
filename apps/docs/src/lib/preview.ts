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

export const PREVIEW: Record<string, PreviewConfig> = {
  Player: { skip: true, note: 'First-person controller — drop it into a world to walk.' },
  LightRig: { skip: true, note: 'Lighting system — lights a whole scene rather than an object.' },
  Sky: { camera: [0, 1.5, 7], target: [0, 3, 0] },
  Terrain: { camera: [11, 8, 13], target: [0, 0, 0] },
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
}
