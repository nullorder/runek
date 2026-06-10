import type { WorldPalette } from './palette'

export type Vec3 = [number, number, number]

/** The contract every Runek component implements. */
export interface WorldComponentProps {
  position?: Vec3
  rotation?: Vec3
  seed?: number
}

/** Linear distance fog over the whole world. */
export interface WorldFog {
  color: string
  /** Distance where the fog starts, in units. */
  near: number
  /** Distance where the fog fully obscures, in units. */
  far: number
}

export interface WorldContextValue {
  /** Meters per unit. Components scale their geometry by this. */
  unit: number
  gravity: Vec3
  /** Resolved color slots components default their materials to. */
  palette: WorldPalette
}
