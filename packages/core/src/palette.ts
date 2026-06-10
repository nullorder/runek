/**
 * Named color slots shared by the whole world. Components default their colors
 * to these slots, so swapping the palette re-themes every component at once —
 * explicit color props still win.
 */
export interface WorldPalette {
  /** Furniture frames, table tops, doors. */
  wood: string
  /** Shelf backs and other shaded wood. */
  woodDark: string
  /** Walls and rooms. */
  wall: string
  /** Interior floors. */
  floor: string
  roof: string
  /** Stairs and masonry. */
  stone: string
  /** Terrain ground cover. */
  ground: string
  /** Leaves and grass. */
  foliage: string
  /** Tree trunks and branches. */
  bark: string
  /** Shores and beaches. */
  sand: string
  /** Rugs and upholstery. */
  fabric: string
  /** Trim, knobs, rug borders. */
  accent: string
  /** Lamp poles and hardware. */
  metal: string
  waterDeep: string
  waterShallow: string
}

export const DEFAULT_PALETTE: WorldPalette = {
  wood: '#6b4f3a',
  woodDark: '#5c4330',
  wall: '#cfc7ba',
  floor: '#b8a98f',
  roof: '#8a5a44',
  stone: '#9a8c78',
  ground: '#3a4a3f',
  foliage: '#4f7a3a',
  bark: '#5b4636',
  sand: '#d8c79a',
  fabric: '#7a3b3b',
  accent: '#caa24a',
  metal: '#39383a',
  waterDeep: '#13415c',
  waterShallow: '#3f86a8',
}
