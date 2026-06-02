import { useWorld, type Vec3 } from '@runek/core'
import { Door } from './Door'
import { Floor } from './Floor'
import { Roof, type RoofStyle } from './Roof'
import { Wall } from './Wall'
import { Window } from './Window'

export interface HouseProps {
  position?: Vec3
  rotation?: Vec3
  /** Interior footprint `[width, depth]`, in units. */
  size?: [number, number]
  height?: number
  thickness?: number
  roofStyle?: RoofStyle
  wallColor?: string
  roofColor?: string
  /** Reserved for procedural variation. */
  seed?: number
}

const DOOR_WIDTH = 1
const DOOR_HEIGHT = 2.1
const WINDOW_WIDTH = 1.3
const WINDOW_HEIGHT = 1.2
const WINDOW_SILL = 1

export function House({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = [9, 9],
  height = 3,
  thickness = 0.2,
  roofStyle = 'gable',
  wallColor = '#d8cfc0',
  roofColor = '#8a5a44',
}: HouseProps) {
  const { unit } = useWorld()
  const [w, d] = size
  const halfW = (w / 2) * unit
  const halfD = (d / 2) * unit
  const sideTurn: Vec3 = [0, Math.PI / 2, 0]
  const windowOpening = {
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    sill: WINDOW_SILL,
  }

  return (
    <group position={position} rotation={rotation}>
      <Floor size={size} thickness={thickness} color={wallColor} />

      <Wall
        position={[0, 0, -halfD]}
        width={w}
        height={height}
        thickness={thickness}
        color={wallColor}
      />
      <Wall
        position={[0, 0, halfD]}
        width={w}
        height={height}
        thickness={thickness}
        color={wallColor}
        opening={{ width: DOOR_WIDTH, height: DOOR_HEIGHT }}
      />
      <Wall
        position={[-halfW, 0, 0]}
        rotation={sideTurn}
        width={d}
        height={height}
        thickness={thickness}
        color={wallColor}
        opening={windowOpening}
      />
      <Wall
        position={[halfW, 0, 0]}
        rotation={sideTurn}
        width={d}
        height={height}
        thickness={thickness}
        color={wallColor}
        opening={windowOpening}
      />

      <Door position={[0, 0, halfD]} width={DOOR_WIDTH} height={DOOR_HEIGHT} openAngle={-1.1} />
      <Window
        position={[-halfW, WINDOW_SILL * unit, 0]}
        rotation={sideTurn}
        width={WINDOW_WIDTH}
        height={WINDOW_HEIGHT}
      />
      <Window
        position={[halfW, WINDOW_SILL * unit, 0]}
        rotation={sideTurn}
        width={WINDOW_WIDTH}
        height={WINDOW_HEIGHT}
      />

      <Roof position={[0, height * unit, 0]} size={size} style={roofStyle} color={roofColor} />
    </group>
  )
}
