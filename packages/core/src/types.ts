export type Vec3 = [number, number, number]

/** The contract every Runek component implements. */
export interface WorldComponentProps {
  position?: Vec3
  rotation?: Vec3
  seed?: number
}

export interface WorldContextValue {
  /** Meters per unit. Components scale their geometry by this. */
  unit: number
  gravity: Vec3
}
