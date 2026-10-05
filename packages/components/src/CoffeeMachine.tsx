import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { pick, rng, sub, useWorld, type WorldComponentProps } from '@runek/core'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'

/** An `espresso` machine with a cup under the group head, or a `drip` brewer with a carafe. */
export type CoffeeMachineKind = 'espresso' | 'drip'

export interface CoffeeMachineProps extends WorldComponentProps {
  /** Seeded when unset. */
  kind?: CoffeeMachineKind
  /** Body color. Seeded from a few appliance finishes when unset. */
  color?: string
  /** A few puffs of steam rising from the cup or carafe. */
  steam?: boolean
}

const FINISHES = ['#2b2b2e', '#b9bdc1', '#a8352b', '#efece4']
const CUP = '#f3efe7'
const GLASS = '#c8dce6'
const COFFEE = '#3b2417'

/**
 * A countertop coffee machine, its origin at its feet so it sits on a `Counter`: an espresso
 * machine (group head, cup on the drip tray, dials) or a drip brewer (water tank, carafe on a hot
 * plate). `steam` sends a few puffs up from the coffee. One small cuboid collider; it stands on a
 * counter, not the ground.
 */
export function CoffeeMachine({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  kind,
  color,
  steam = true,
}: CoffeeMachineProps) {
  const { unit, palette } = useWorld()
  const u = unit
  const look = useMemo(() => {
    const r = rng(sub(seed, 0))
    const rolled = {
      kind: pick<CoffeeMachineKind>(r, ['espresso', 'drip']),
      finish: pick(r, FINISHES),
    }
    return { kind: kind ?? rolled.kind, body: color ?? rolled.finish }
  }, [seed, kind, color])

  const metal = palette.metal
  const puffs = useRef<(Group | null)[]>([])
  const espresso = look.kind === 'espresso'
  // Where the steam starts: the cup's or the carafe's mouth.
  const mouth: [number, number, number] = espresso ? [0, 0.1 * u, 0.1 * u] : [0, 0.17 * u, 0.09 * u]

  useFrame(({ clock }) => {
    if (!steam) return
    const t = clock.elapsedTime
    puffs.current.forEach((g, i) => {
      if (!g) return
      const k = (t * 0.6 + i / 3) % 1
      g.position.set(Math.sin(k * 6 + i * 2) * 0.012 * u, k * 0.16 * u, 0)
      g.scale.setScalar(0.4 + k * 1.2)
      g.visible = k < 0.9
    })
  })

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[0.14 * u, 0.17 * u, 0.15 * u]} position={[0, 0.17 * u, 0]} />
      {espresso ? (
        <>
          <mesh position={[0, 0.2 * u, -0.04 * u]} castShadow receiveShadow>
            <boxGeometry args={[0.28 * u, 0.32 * u, 0.24 * u]} />
            <meshStandardMaterial color={look.body} roughness={0.35} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.02 * u, 0.04 * u]} castShadow receiveShadow>
            <boxGeometry args={[0.28 * u, 0.04 * u, 0.26 * u]} />
            <meshStandardMaterial color={look.body} roughness={0.35} metalness={0.3} />
          </mesh>
          {/* drip tray grille, group head, portafilter */}
          <mesh position={[0, 0.042 * u, 0.1 * u]}>
            <boxGeometry args={[0.22 * u, 0.006 * u, 0.12 * u]} />
            <meshStandardMaterial color={metal} roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.25 * u, 0.1 * u]} castShadow>
            <cylinderGeometry args={[0.035 * u, 0.04 * u, 0.04 * u, 16]} />
            <meshStandardMaterial color={metal} roughness={0.25} metalness={0.85} />
          </mesh>
          <mesh position={[0, 0.215 * u, 0.13 * u]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.009 * u, 0.009 * u, 0.12 * u, 8]} />
            <meshStandardMaterial color="#1c1c1e" roughness={0.6} />
          </mesh>
          {/* the cup */}
          <mesh position={[0, 0.075 * u, 0.1 * u]} castShadow>
            <cylinderGeometry args={[0.03 * u, 0.025 * u, 0.06 * u, 14]} />
            <meshStandardMaterial color={CUP} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.104 * u, 0.1 * u]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.026 * u, 14]} />
            <meshStandardMaterial color={COFFEE} roughness={0.4} />
          </mesh>
          {/* dials and a lit button */}
          {[-1, 1].map((s) => (
            <mesh
              key={s}
              position={[s * 0.09 * u, 0.3 * u, 0.082 * u]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.018 * u, 0.018 * u, 0.012 * u, 14]} />
              <meshStandardMaterial color={metal} roughness={0.3} metalness={0.7} />
            </mesh>
          ))}
          <mesh position={[0, 0.31 * u, 0.0811 * u]}>
            <circleGeometry args={[0.008 * u, 10]} />
            <meshBasicMaterial color="#5be08a" toneMapped={false} />
          </mesh>
        </>
      ) : (
        <>
          {/* back column with the tank on top, a head reaching over the carafe, a base plate */}
          <mesh position={[0, 0.17 * u, -0.08 * u]} castShadow receiveShadow>
            <boxGeometry args={[0.2 * u, 0.34 * u, 0.12 * u]} />
            <meshStandardMaterial color={look.body} roughness={0.4} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.31 * u, 0.04 * u]} castShadow>
            <boxGeometry args={[0.2 * u, 0.06 * u, 0.14 * u]} />
            <meshStandardMaterial color={look.body} roughness={0.4} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.015 * u, 0.02 * u]} castShadow receiveShadow>
            <boxGeometry args={[0.2 * u, 0.03 * u, 0.26 * u]} />
            <meshStandardMaterial color={look.body} roughness={0.4} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.032 * u, 0.06 * u]}>
            <cylinderGeometry args={[0.065 * u, 0.065 * u, 0.006 * u, 20]} />
            <meshStandardMaterial color="#1c1c1e" roughness={0.5} />
          </mesh>
          {/* the carafe: glass, half full */}
          <mesh position={[0, 0.1 * u, 0.06 * u]} castShadow>
            <cylinderGeometry args={[0.05 * u, 0.06 * u, 0.13 * u, 18]} />
            <meshPhysicalMaterial color={GLASS} roughness={0.05} transparent opacity={0.4} />
          </mesh>
          <mesh position={[0, 0.07 * u, 0.06 * u]}>
            <cylinderGeometry args={[0.055 * u, 0.058 * u, 0.06 * u, 18]} />
            <meshStandardMaterial color={COFFEE} roughness={0.3} />
          </mesh>
          <mesh position={[0.07 * u, 0.1 * u, 0.06 * u]}>
            <boxGeometry args={[0.015 * u, 0.08 * u, 0.02 * u]} />
            <meshStandardMaterial color="#1c1c1e" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.24 * u, -0.0195 * u]}>
            <circleGeometry args={[0.008 * u, 10]} />
            <meshBasicMaterial color="#e05a3a" toneMapped={false} />
          </mesh>
        </>
      )}
      {steam && (
        <group position={mouth}>
          {[0, 1, 2].map((i) => (
            <group
              key={i}
              ref={(g) => {
                puffs.current[i] = g
              }}
            >
              <mesh>
                <sphereGeometry args={[0.012 * u, 8, 6]} />
                <meshBasicMaterial color="#eef2f4" transparent opacity={0.5} depthWrite={false} />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </RigidBody>
  )
}
