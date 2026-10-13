import {
  Bench,
  Floor,
  Lamp,
  Person,
  type PersonProps,
  Plant,
  Rug,
  Shelf,
  Sign,
  Wall,
} from '@runek/components'
import { memo } from 'react'

const GREEN = '#3df58a'
const WALL = '#d6cdbf'
const H = 4.2

/** The hall's west wall, and the doorway in it. */
export const HALL_WEST = -15
export const DOOR_Z = -9
export const DOOR = { width: 2.2, height: 2.8 }
/** The room runs 10 m west of the hall, 10 m along it, centered on the door. */
const DEPTH = 10
const WIDTH = 10
const CX = HALL_WEST - DEPTH / 2
/** The turntable platform: where the figure being customised stands. */
export const PLATFORM = {
  position: [HALL_WEST - 6, 0, DOOR_Z] as [number, number, number],
  height: 0.22,
  radius: 1.15,
}
/** The figure faces the door (+x), so the camera looks in from the hall side. */
export const FACING = Math.PI / 2

const MANNEQUIN: Omit<PersonProps, 'position'> = {
  physics: false,
  idle: false,
  lookAt: false,
  detail: 'low',
  skinTone: '#d9d4ca',
  hair: 'bald',
  facialHair: 'none',
  clothes: [],
  face: { eyes: { color: '#d9d4ca', size: 0.6 }, brows: { weight: 0 }, blush: 0 },
}

function Rail({ position }: { position: [number, number, number] }) {
  const garments = ['#7a2e2e', '#2f5d50', '#3b4a6b', '#c9a227', '#22252b', '#8a6f9e', '#d97b4a']
  return (
    <group position={position}>
      {[-1.3, 1.3].map((x) => (
        <mesh key={x} position={[x, 0.9, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 1.8, 10]} />
          <meshStandardMaterial color="#2a2d33" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 1.78, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 2.7, 10]} />
        <meshStandardMaterial color="#2a2d33" metalness={0.6} roughness={0.35} />
      </mesh>
      {garments.map((color, i) => (
        <mesh
          key={color}
          position={[-1.05 + i * 0.35, 1.3, 0]}
          rotation={[0, Math.PI / 2 + (i % 2 ? 0.08 : -0.06), 0]}
          castShadow
        >
          <boxGeometry args={[0.46, 0.86 - (i % 3) * 0.12, 0.05]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

function Mirror({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 1.25, 0]} castShadow>
        <boxGeometry args={[1.0, 2.2, 0.06]} />
        <meshStandardMaterial color="#3a2a1e" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.25, 0.035]}>
        <planeGeometry args={[0.86, 2.06]} />
        <meshPhysicalMaterial color="#cfdbe2" metalness={0.35} roughness={0.04} clearcoat={1} />
      </mesh>
    </group>
  )
}

/** The room's door wall and a strip of the hall beyond it: what the avatar studio's own canvas
 *  shows of the hall, instead of the whole hall and its lamps. */
export function HallSide() {
  return (
    <group name="hall-side">
      <Wall
        position={[HALL_WEST, 0, DOOR_Z]}
        rotation={[0, Math.PI / 2, 0]}
        width={WIDTH + 0.2}
        height={H + 1.3}
        color="#c3bcae"
        openings={[DOOR]}
      />
      <Floor position={[HALL_WEST + 3, 0, DOOR_Z]} size={[6, WIDTH]} color="#585c62" />
    </group>
  )
}

/** The avatar studio behind the hall's west door: a platform, mirrors, a clothes rail, and (when
 *  `full`, seen from inside) lamps and two mannequins. Seen through the door from the hall it
 *  stays light, since every lamp is one more light in every shader. Built from catalog
 *  components like the hall itself. */
export const AvatarStudio = memo(function AvatarStudio({ full = false }: { full?: boolean }) {
  const [px, , pz] = PLATFORM.position
  return (
    <group name="avatar-studio">
      <Floor position={[CX, 0, DOOR_Z]} size={[DEPTH, WIDTH]} color="#6b5440" />
      <Wall position={[CX, 0, DOOR_Z - WIDTH / 2]} width={DEPTH + 0.2} height={H} color={WALL} />
      <Wall position={[CX, 0, DOOR_Z + WIDTH / 2]} width={DEPTH + 0.2} height={H} color={WALL} />
      <Wall
        position={[HALL_WEST - DEPTH, 0, DOOR_Z]}
        rotation={[0, Math.PI / 2, 0]}
        width={WIDTH}
        height={H}
        color={WALL}
      />

      <Rug position={[px + 0.6, 0.01, pz]} size={[4.2, 3.4]} seed={14} />
      <mesh position={[px, PLATFORM.height / 2, pz]} receiveShadow castShadow>
        <cylinderGeometry args={[PLATFORM.radius, PLATFORM.radius + 0.08, PLATFORM.height, 64]} />
        <meshStandardMaterial color="#1f242b" roughness={0.5} metalness={0.25} />
      </mesh>
      <mesh position={[px, PLATFORM.height + 0.002, pz]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[PLATFORM.radius - 0.06, PLATFORM.radius - 0.02, 64]} />
        <meshBasicMaterial color={GREEN} toneMapped={false} />
      </mesh>

      <Sign
        position={[HALL_WEST - DEPTH + 0.16, 3.35, DOOR_Z]}
        rotation={[0, Math.PI / 2, 0]}
        size={0.5}
        color={GREEN}
        glow
      >
        AVATAR STUDIO
      </Sign>
      <Mirror position={[HALL_WEST - DEPTH + 0.1, 0, DOOR_Z - 2.6]} rotation={Math.PI / 2} />
      <Mirror position={[HALL_WEST - DEPTH + 0.1, 0, DOOR_Z + 2.6]} rotation={Math.PI / 2} />
      <Sign
        position={[HALL_WEST - 0.16, 3.2, DOOR_Z]}
        rotation={[0, -Math.PI / 2, 0]}
        size={0.26}
        color={GREEN}
        glow
      >
        ← WORKSHOP
      </Sign>

      <Rail position={[CX - 0.5, 0, DOOR_Z - WIDTH / 2 + 0.55]} />
      <Shelf
        position={[CX + 2.6, 0, DOOR_Z + WIDTH / 2 - 0.3]}
        rotation={[0, Math.PI, 0]}
        width={1.6}
        height={1.9}
        seed={9}
      />
      <Bench
        position={[CX - 1.4, 0, DOOR_Z + WIDTH / 2 - 0.55]}
        rotation={[0, Math.PI, 0]}
        length={1.8}
      />
      <Plant position={[HALL_WEST - 1, 0, DOOR_Z - WIDTH / 2 + 0.7]} seed={4} height={1.2} />
      <Plant position={[HALL_WEST - 1, 0, DOOR_Z + WIDTH / 2 - 0.7]} seed={8} height={1.2} />
      {full && (
        <>
          <Person
            {...MANNEQUIN}
            position={[HALL_WEST - 8.6, 0, DOOR_Z - 3.7]}
            rotation={[0, 0.5, 0]}
            gender="feminine"
          />
          <Person
            {...MANNEQUIN}
            position={[HALL_WEST - 8.6, 0, DOOR_Z + 3.7]}
            rotation={[0, Math.PI - 0.5, 0]}
            gender="masculine"
          />
          <Lamp position={[HALL_WEST - 9.3, 0, DOOR_Z - 4.3]} height={2.2} intensity={14} />
          <Lamp position={[HALL_WEST - 9.3, 0, DOOR_Z + 4.3]} height={2.2} intensity={14} />
        </>
      )}
    </group>
  )
})
