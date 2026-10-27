import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useMaterials, useWorld, type WorldComponentProps } from '@runek/core'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { ExtrudeGeometry, type InstancedMesh, Object3D, Shape } from 'three'

export interface PianoProps extends WorldComponentProps {
  /** How far the lid is propped open, in radians; 0 shuts it. */
  lid?: number
  /** A bench in front of the keys. */
  bench?: boolean
  /** The case. Black lacquer unless given. */
  color?: string
}

const WIDTH = 1.5
const LENGTH = 1.9
const RIM = 0.3
const RIM_BOTTOM = 0.62
const WHITE_KEYS = 52
const KEYBOARD = 1.22
const KEY_W = KEYBOARD / WHITE_KEYS

/** The case seen from above: a straight bass side, a tail, and the bent treble side curving
 *  back to the keys. y runs back from the keyboard. */
function outline(): Shape {
  const w = WIDTH / 2
  const s = new Shape()
  s.moveTo(-w, 0)
  s.lineTo(w, 0)
  s.lineTo(w, 0.45)
  s.bezierCurveTo(w, 0.95, -0.05, 0.85, -0.12, LENGTH - 0.15)
  s.quadraticCurveTo(-0.2, LENGTH, -w + 0.25, LENGTH)
  s.quadraticCurveTo(-w, LENGTH, -w, LENGTH - 0.3)
  s.lineTo(-w, 0)
  return s
}

// Black keys sit between white ones: A0 has one, then C to B repeats with none after E and B.
const BLACK_KEYS = Array.from({ length: WHITE_KEYS - 1 }, (_, i) => i)
  .filter((i) => {
    const note = (i + 5) % 7
    return note !== 2 && note !== 6
  })
  .map((i) => -KEYBOARD / 2 + KEY_W * (i + 1))

const LEGS: [number, number][] = [
  [-(WIDTH / 2 - 0.1), -0.1],
  [WIDTH / 2 - 0.1, -0.1],
  [-0.3, -(LENGTH - 0.2)],
]

/**
 * A grand piano standing on its origin with the keyboard toward local +Z: a lacquered case on
 * three legs, the lid propped open on the bass side's hinge, a music desk, eighty-eight keys
 * and a pedal lyre, and a bench in front where a player sits facing -Z. One cuboid collider
 * round the case; the bench has none, so a `Person` can sit on it.
 */
export function Piano({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  lid = 0.6,
  bench = true,
  color = '#0e0e10',
}: PianoProps) {
  const { unit } = useWorld()
  const m = useMaterials({
    lacquer: { color, roughness: 0.18, metalness: 0.15 },
    brass: { color: '#c9a24a', roughness: 0.3, metalness: 0.8 },
    ivory: { color: '#f4f1e8', roughness: 0.35 },
    ebony: { color: '#141414', roughness: 0.3 },
  })
  const { body, top } = useMemo(() => {
    const shape = outline()
    const extrude = (depth: number) =>
      new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 })
    return { body: extrude(RIM), top: extrude(0.02) }
  }, [])
  useEffect(
    () => () => {
      body.dispose()
      top.dispose()
    },
    [body, top],
  )

  const keys = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = keys.current
    if (!mesh) return
    const dummy = new Object3D()
    BLACK_KEYS.forEach((x, i) => {
      dummy.position.set(x * unit, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [unit])

  const keyY = 0.72 * unit
  // The prop stick stands on the treble rim and meets the lid's underside near its edge.
  const prop = useMemo(() => {
    if (lid <= 0.05) return null
    const rim = RIM_BOTTOM + RIM
    const [x0, y0] = [WIDTH / 2 - 0.2, rim]
    const [x1, y1] = [-WIDTH / 2 + 1.3 * Math.cos(lid), rim + 1.3 * Math.sin(lid)]
    return {
      x: (x0 + x1) / 2,
      y: (y0 + y1) / 2,
      length: Math.hypot(x1 - x0, y1 - y0),
      tilt: Math.atan2(x0 - x1, y1 - y0),
    }
  }, [lid])

  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[(WIDTH / 2) * unit, 0.5 * unit, (LENGTH / 2) * unit]}
          position={[0, 0.5 * unit, -(LENGTH / 2) * unit]}
        />
      </RigidBody>
      <mesh
        geometry={body}
        material={m.lacquer}
        castShadow
        receiveShadow
        position={[0, RIM_BOTTOM * unit, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={unit}
      />
      <group position={[-(WIDTH / 2) * unit, (RIM_BOTTOM + RIM) * unit, 0]} rotation={[0, 0, lid]}>
        <mesh
          geometry={top}
          material={m.lacquer}
          castShadow
          position={[(WIDTH / 2) * unit, 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={unit}
        />
      </group>
      {prop && (
        <mesh
          material={m.lacquer}
          position={[prop.x * unit, prop.y * unit, -0.75 * unit]}
          rotation={[0, 0, prop.tilt]}
        >
          <cylinderGeometry args={[0.012 * unit, 0.012 * unit, prop.length * unit, 6]} />
        </mesh>
      )}
      {LEGS.map(([x, z]) => (
        <mesh
          key={`${x}${z}`}
          material={m.lacquer}
          castShadow
          position={[x * unit, (RIM_BOTTOM / 2) * unit, z * unit]}
        >
          <cylinderGeometry args={[0.05 * unit, 0.035 * unit, RIM_BOTTOM * unit, 10]} />
        </mesh>
      ))}
      <mesh material={m.lacquer} position={[0, 0.12 * unit, -0.2 * unit]}>
        <boxGeometry args={[0.14 * unit, 0.24 * unit, 0.05 * unit]} />
      </mesh>
      {[-0.04, 0, 0.04].map((x) => (
        <mesh key={x} material={m.brass} position={[x * unit, 0.03 * unit, -0.14 * unit]}>
          <boxGeometry args={[0.025 * unit, 0.01 * unit, 0.08 * unit]} />
        </mesh>
      ))}
      <mesh material={m.lacquer} castShadow position={[0, keyY - 0.05 * unit, 0.13 * unit]}>
        <boxGeometry args={[1.4 * unit, 0.1 * unit, 0.3 * unit]} />
      </mesh>
      <mesh material={m.ivory} position={[0, keyY + 0.012 * unit, 0.16 * unit]}>
        <boxGeometry args={[KEYBOARD * unit, 0.024 * unit, 0.15 * unit]} />
      </mesh>
      <instancedMesh
        ref={keys}
        args={[undefined, undefined, BLACK_KEYS.length]}
        material={m.ebony}
        position={[0, keyY + 0.032 * unit, 0.12 * unit]}
      >
        <boxGeometry args={[KEY_W * 0.6 * unit, 0.02 * unit, 0.09 * unit]} />
      </instancedMesh>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          material={m.lacquer}
          castShadow
          position={[s * 0.66 * unit, keyY + 0.03 * unit, 0.14 * unit]}
        >
          <boxGeometry args={[0.08 * unit, 0.1 * unit, 0.3 * unit]} />
        </mesh>
      ))}
      <mesh
        material={m.lacquer}
        castShadow
        position={[0, (RIM_BOTTOM + RIM + 0.14) * unit, -0.1 * unit]}
        rotation={[-0.25, 0, 0]}
      >
        <boxGeometry args={[0.7 * unit, 0.3 * unit, 0.02 * unit]} />
      </mesh>
      {bench && (
        <group position={[0, 0, 0.75 * unit]}>
          <mesh material={m.lacquer} castShadow receiveShadow position={[0, 0.47 * unit, 0]}>
            <boxGeometry args={[0.8 * unit, 0.07 * unit, 0.36 * unit]} />
          </mesh>
          {[-1, 1].flatMap((sx) =>
            [-1, 1].map((sz) => (
              <mesh
                key={`${sx}${sz}`}
                material={m.lacquer}
                castShadow
                position={[sx * 0.34 * unit, 0.22 * unit, sz * 0.14 * unit]}
              >
                <boxGeometry args={[0.04 * unit, 0.44 * unit, 0.04 * unit]} />
              </mesh>
            )),
          )}
        </group>
      )}
    </group>
  )
}

Piano.groundSitting = true
