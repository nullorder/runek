import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useWorld, type WorldComponentProps } from '@runek/core'
import { Sign } from './Sign'

export interface SignpostProps extends WorldComponentProps {
  /**
   * The name shown on the board. A plain string, **not** `children`: a world renderer overrides a
   * node's `children` prop with its nested nodes, so text authored in JSON must be a named prop to
   * survive. Empty by default — `<Signpost />` is a blank board.
   */
  name?: string
  /** Post height, in units. */
  height?: number
  /** Board width, in units. */
  width?: number
  /** Post + board wood color; defaults to the palette's `wood`. */
  color?: string
  /** Name color; defaults to the palette's `sand` (legible on the wood). */
  textColor?: string
  /** Name cap height, in units. */
  size?: number
}

/**
 * A roadside signboard: a wooden post and a plank carrying a name in the world's display font.
 * The post sits **behind** the plank so it never crosses the text, and the board is single-sided
 * (its front faces local +Z) — rotate it to face the reader. The post is the only collider.
 */
export function Signpost({
  name = '',
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  height = 2.6,
  width = 3.4,
  color,
  textColor,
  size = 0.5,
}: SignpostProps) {
  const { unit, palette } = useWorld()
  const wood = color ?? palette.wood
  const ink = textColor ?? palette.sand
  const H = height * unit
  const W = width * unit
  const boardH = 0.95 * unit
  const boardY = H - boardH / 2
  const boardD = 0.12 * unit
  const postR = 0.1 * unit
  // The post sits wholly behind the plank (overlapping it a touch) so it never crosses the front
  // face where the name is drawn.
  const postZ = -(boardD / 2 + postR - 0.03 * unit)
  const boardZ = boardD / 2 + 0.02 * unit

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[postR, H / 2, postR]} position={[0, H / 2, postZ]} />

      {/* post — behind the plank, clear of the text */}
      <mesh position={[0, H / 2, postZ]} castShadow>
        <cylinderGeometry args={[postR, postR, H, 8]} />
        <meshStandardMaterial color={palette.woodDark} roughness={0.85} />
      </mesh>

      {/* plank */}
      <mesh position={[0, boardY, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, boardH, boardD]} />
        <meshStandardMaterial color={wood} roughness={0.8} />
      </mesh>

      {/* the name, on the clear front face */}
      {name && (
        <Sign position={[0, boardY, boardZ]} size={size} variant="display" color={ink}>
          {name}
        </Sign>
      )}
    </RigidBody>
  )
}
