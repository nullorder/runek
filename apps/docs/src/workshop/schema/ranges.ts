/** Hand-tuned slider ranges, `[min, max, step]`, where the heuristics in `controls.ts` guess
 *  wrong. Keyed by component, then prop. The number field still accepts any value. */
export const RANGES: Record<string, Record<string, [number, number, number]>> = {
  Bookshelf: { fill: [0, 1, 0.05], shelves: [1, 8, 1] },
  Trees: { iterations: [1, 4, 1], angle: [0.1, 1.2, 0.01] },
  Terrain: {
    relief: [0, 12, 0.1],
    resolution: [8, 192, 8],
    frequency: [0.005, 0.2, 0.005],
    flatRadius: [0, 60, 0.5],
    falloff: [0, 1, 0.01],
  },
  Grass: { count: [0, 6000, 50], sway: [0, 3, 0.05] },
  Person: {
    height: [0.6, 2.2, 0.01],
    wander: [0, 12, 0.1],
    speed: [0, 4, 0.05],
    gait: [0, 2, 0.05],
  },
  Clouds: { count: [1, 30, 1], drift: [0, 3, 0.05] },
  Birds: { count: [1, 60, 1] },
  Lamp: { intensity: [0, 60, 0.5], flicker: [0, 1, 0.01] },
  LightRig: { sunIntensity: [0, 6, 0.05], ambient: [0, 3, 0.05], shadowRange: [5, 120, 1] },
}
