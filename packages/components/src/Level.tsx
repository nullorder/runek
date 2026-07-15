import { useWorld, type Vec3 } from '@runek/core'
import { Floor, type FloorOpening } from './Floor'
import { Wall, type WallOpening } from './Wall'

/** One side of a level's wall ring. */
export interface LevelWallConfig {
  /** Set `false` to leave this side open (porch, lean-to). */
  present?: boolean
  openings?: WallOpening[]
  /** Defaults to the level `color`, then the world palette's `wall` slot. */
  color?: string
}

/** Per-side wall configs: front is +z, back is -z, left is -x, right is +x. */
export interface LevelWalls {
  front?: LevelWallConfig
  back?: LevelWallConfig
  left?: LevelWallConfig
  right?: LevelWallConfig
}

export interface LevelFloorConfig {
  opening?: FloorOpening
  thickness?: number
  /** Defaults to the world palette's `floor` slot. */
  color?: string
}

export interface LevelProps {
  position?: Vec3
  rotation?: Vec3
  /** Interior footprint `[width, depth]`, in units. */
  size?: [number, number]
  height?: number
  thickness?: number
  /** Per-side wall configs; an omitted side renders a solid wall. */
  walls?: LevelWalls
  /** The slab underfoot; `false` for none, or a config with a stairwell `opening`. */
  floor?: boolean | LevelFloorConfig
  /** Defaults to the world palette's `wall` slot. */
  color?: string
  /** Reserved for procedural variation. */
  seed?: number
}

const SIDE_TURN: Vec3 = [0, Math.PI / 2, 0]

/**
 * One ring of walls plus an optional slab — the stackable unit of a building.
 * Its origin is the base of its walls, so level N sits at the summed height of
 * the levels below it. Composes `Wall` and `Floor`.
 */
export function Level({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = [8, 8],
  height = 3,
  thickness = 0.2,
  walls,
  floor = true,
  color,
}: LevelProps) {
  const { unit } = useWorld()
  const [w, d] = size
  const halfW = (w / 2) * unit
  const halfD = (d / 2) * unit
  const floorConfig = floor === true ? {} : floor

  const side = (config: LevelWallConfig | undefined, pos: Vec3, turned: boolean, width: number) =>
    config?.present === false ? null : (
      <Wall
        position={pos}
        rotation={turned ? SIDE_TURN : undefined}
        width={width}
        height={height}
        thickness={thickness}
        color={config?.color ?? color}
        openings={config?.openings}
      />
    )

  return (
    <group position={position} rotation={rotation}>
      {floorConfig && (
        <Floor
          position={[0, 0, 0]}
          size={size}
          thickness={floorConfig.thickness ?? thickness}
          opening={floorConfig.opening}
          color={floorConfig.color}
        />
      )}
      {side(walls?.front, [0, 0, halfD], false, w)}
      {side(walls?.back, [0, 0, -halfD], false, w)}
      {side(walls?.left, [-halfW, 0, 0], true, d)}
      {side(walls?.right, [halfW, 0, 0], true, d)}
    </group>
  )
}
