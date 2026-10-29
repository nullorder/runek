import { CuboidCollider, CylinderCollider } from '@react-three/rapier'
import { useLight } from '@runek/core'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  type BufferGeometry,
  Color,
  CylinderGeometry,
  Euler,
  type InstancedMesh,
  type Material,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three'
import { bowZ, GANGWAY, halfBreadth, LEVEL, type ShipShape, sternZ } from '../surfaces/ship'
import type { Gun, Hammock } from './fittings'
import { onHull } from './hull'
import type { V3 } from './mesh'

export type Mats = Record<
  'wood' | 'dark' | 'iron' | 'port' | 'lid' | 'canvas' | 'glass' | 'brass' | 'rope',
  Material
>

const matrix = (position: V3, rotation: V3 = [0, 0, 0], scale: V3 = [1, 1, 1], order = 'XYZ') =>
  new Matrix4().compose(
    new Vector3(...position),
    new Quaternion().setFromEuler(new Euler(...rotation, order as 'XYZ')),
    new Vector3(...scale),
  )

/** One instanced draw for many copies of a part. */
export function Instanced({
  geometry,
  material,
  matrices,
  colors,
  castShadow = false,
}: {
  geometry: BufferGeometry
  material: Material
  matrices: Matrix4[]
  colors?: Color[]
  castShadow?: boolean
}) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    matrices.forEach((m, i) => {
      mesh.setMatrixAt(i, m)
      if (colors) mesh.setColorAt(i, colors[i])
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [matrices, colors])
  useEffect(() => () => geometry.dispose(), [geometry])
  if (!matrices.length) return null
  return (
    <instancedMesh
      key={matrices.length}
      ref={ref}
      args={[geometry, material, matrices.length]}
      castShadow={castShadow}
      receiveShadow
    />
  )
}

const BARREL = matrix([0.15, 0.62, 0], [0, 0, -Math.PI / 2])
const CARRIAGE = matrix([-0.15, 0.34, 0])
const WHEELS = [-1, 1].flatMap((a) =>
  [-1, 1].map((b) => matrix([-0.15 + a * 0.42, 0.17, b * 0.42], [Math.PI / 2, 0, 0])),
)

/** Cannons on their carriages, run out to the ports. */
export function Cannons({ guns, m }: { guns: Gun[]; m: Mats }) {
  const parts = useMemo(() => {
    const bases = guns.map((g) => matrix([g.x, g.y, g.z], [0, g.side > 0 ? 0 : Math.PI, 0]))
    return {
      barrel: new CylinderGeometry(0.12, 0.2, 2, 12),
      carriage: new BoxGeometry(1.3, 0.36, 0.78),
      wheel: new CylinderGeometry(0.17, 0.17, 0.1, 10),
      barrels: bases.map((b) => b.clone().multiply(BARREL)),
      carriages: bases.map((b) => b.clone().multiply(CARRIAGE)),
      wheels: bases.flatMap((b) => WHEELS.map((w) => b.clone().multiply(w))),
    }
  }, [guns])
  return (
    <>
      <Instanced geometry={parts.barrel} material={m.iron} matrices={parts.barrels} castShadow />
      <Instanced
        geometry={parts.carriage}
        material={m.wood}
        matrices={parts.carriages}
        castShadow
      />
      <Instanced geometry={parts.wheel} material={m.dark} matrices={parts.wheels} />
    </>
  )
}

/** One cuboid per gun: the gun line is something you walk round, not through. */
export function CannonColliders({ guns }: { guns: Gun[] }) {
  return guns.map((g) => (
    <CuboidCollider
      key={`${g.side}:${g.y}:${g.z.toFixed(2)}`}
      args={[0.95, 0.45, 0.42]}
      position={[g.x, g.y + 0.45, g.z]}
    />
  ))
}

const LID_SHUT = matrix([0.05, 0, 0])
const LID_OPEN = matrix([0.03, 0.33, 0])
  .multiply(matrix([0, 0, 0], [0, 0, 1.15]))
  .multiply(matrix([0.03, -0.33, 0]))

/** A dark recess and a lid for each gun's port, flush on the hull. */
export function Ports({ guns, shape, m }: { guns: Gun[]; shape: ShipShape; m: Mats }) {
  const parts = useMemo(() => {
    const frames = guns.map((g) => {
      const size = g.y === LEVEL.gun ? 1 : 0.8
      const { position, rotation } = onHull(shape, g.side, g.z, g.portY, 0.01)
      return { base: matrix(position, rotation, [1, size, size], 'YZX'), open: g.open }
    })
    return {
      port: new BoxGeometry(0.08, 0.62, 0.62),
      lid: new BoxGeometry(0.06, 0.66, 0.66),
      ports: frames.map((f) => f.base),
      lids: frames.map((f) => f.base.clone().multiply(f.open ? LID_OPEN : LID_SHUT)),
    }
  }, [guns, shape])
  return (
    <>
      <Instanced geometry={parts.port} material={m.port} matrices={parts.ports} />
      <Instanced geometry={parts.lid} material={m.lid} matrices={parts.lids} />
    </>
  )
}

/** Canvas hammocks slung under the beams, each sagging and weathered a little differently. */
export function Hammocks({ items, m }: { items: Hammock[]; m: Mats }) {
  const parts = useMemo(() => {
    const g = new PlaneGeometry(0.8, 1.9, 6, 8)
    g.rotateX(-Math.PI / 2)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / 0.4
      const v = p.getZ(i) / 0.95
      p.setY(i, -0.2 * (1 - u * u) * (1 - v ** 6))
    }
    g.computeVertexNormals()
    const base = new Color(1, 1, 1)
    return {
      geometry: g,
      matrices: items.map((h) => matrix([h.x, h.y, h.z], [0, 0, 0], [1, h.sag, 1])),
      colors: items.map((h) => base.clone().multiplyScalar(h.tint)),
    }
  }, [items])
  return (
    <Instanced
      geometry={parts.geometry}
      material={m.canvas}
      matrices={parts.matrices}
      colors={parts.colors}
    />
  )
}

/** A hanging lantern, or a big stern lantern on the taffrail. Lit through the light pool. */
export function Lantern({
  position,
  stern = false,
  m,
}: {
  position: V3
  stern?: boolean
  m: Mats
}) {
  const glow = useLight({
    color: '#ffb766',
    intensity: stern ? 14 : 7,
    distance: stern ? 14 : 9,
    decay: 2,
  })
  const k = stern ? 2.2 : 1
  return (
    <group position={position} scale={k}>
      {!stern && (
        <mesh material={m.iron} position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.32, 4]} />
        </mesh>
      )}
      {stern && (
        <mesh material={m.iron} position={[0, -0.32, 0]}>
          <cylinderGeometry args={[0.03, 0.05, 0.28, 6]} />
        </mesh>
      )}
      <mesh material={m.glass}>
        <cylinderGeometry args={[0.11, 0.09, 0.3, 6]} />
      </mesh>
      <mesh material={m.iron} position={[0, 0.19, 0]}>
        <coneGeometry args={[0.15, 0.12, 6]} />
      </mesh>
      <mesh material={m.iron} position={[0, -0.17, 0]}>
        <cylinderGeometry args={[0.12, 0.1, 0.04, 6]} />
      </mesh>
      <object3D ref={glow.ref} />
    </group>
  )
}

/** The ship's wheel on its pedestal, with the binnacle forward of it. */
export function Wheel({ z, m }: { z: number; m: Mats }) {
  const y = LEVEL.quarter
  return (
    <group position={[0, y, z]}>
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.wood} position={[s * 0.32, 0.62, 0]} castShadow>
          <boxGeometry args={[0.12, 1.25, 0.18]} />
        </mesh>
      ))}
      <mesh material={m.wood} position={[0, 1.15, 0]} castShadow>
        <boxGeometry args={[0.76, 0.26, 0.3]} />
      </mesh>
      <group position={[0, 1.15, 0.22]}>
        <mesh material={m.dark} castShadow>
          <torusGeometry args={[0.62, 0.035, 6, 28]} />
        </mesh>
        <mesh material={m.dark} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 0.14, 10]} />
        </mesh>
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} material={m.dark} rotation={[0, 0, (k * Math.PI) / 4]}>
            <boxGeometry args={[0.04, 1.62, 0.04]} />
          </mesh>
        ))}
      </group>
      <group position={[0, 0, 1.1]}>
        <mesh material={m.wood} position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.28, 1, 8]} />
        </mesh>
        <mesh material={m.brass} position={[0, 1, 0]}>
          <sphereGeometry args={[0.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </group>
    </group>
  )
}

export function WheelColliders({ z }: { z: number }) {
  const y = LEVEL.quarter
  return (
    <>
      <CuboidCollider args={[0.45, 0.9, 0.3]} position={[0, y + 0.9, z + 0.05]} />
      <CylinderCollider args={[0.55, 0.28]} position={[0, y + 0.55, z + 1.1]} />
    </>
  )
}

/** The capstan: a waisted drum with whelps under a round drumhead. */
export function Capstan({ z, m }: { z: number; m: Mats }) {
  return (
    <group position={[0, LEVEL.main, z]}>
      <mesh material={m.wood} position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.46, 0.9, 12]} />
      </mesh>
      {Array.from({ length: 8 }, (_, k) => {
        const a = (k / 8) * Math.PI * 2
        return (
          <mesh
            key={a}
            material={m.dark}
            position={[Math.sin(a) * 0.44, 0.45, Math.cos(a) * 0.44]}
            rotation={[0, a, 0]}
          >
            <boxGeometry args={[0.08, 0.82, 0.1]} />
          </mesh>
        )
      })}
      <mesh material={m.wood} position={[0, 0.98, 0]} castShadow>
        <cylinderGeometry args={[0.58, 0.58, 0.16, 16]} />
      </mesh>
    </group>
  )
}

/** The ship's bell in a small belfry at the forecastle's break. */
export function Bell({ z, m }: { z: number; m: Mats }) {
  return (
    <group position={[0, LEVEL.fore, z]}>
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.wood} position={[s * 0.36, 0.7, 0]} castShadow>
          <boxGeometry args={[0.1, 1.4, 0.12]} />
        </mesh>
      ))}
      <mesh material={m.wood} position={[0, 1.42, 0]} castShadow>
        <boxGeometry args={[0.86, 0.12, 0.16]} />
      </mesh>
      <mesh material={m.brass} position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.17, 0.3, 14, 1, true]} />
      </mesh>
    </group>
  )
}

/** The rudder, hung on the raked sternpost from below the keel line to the counter. */
export function Rudder({ shape, m }: { shape: ShipShape; m: Mats }) {
  const y0 = LEVEL.keel + 0.3
  const y1 = LEVEL.gun + 0.6
  const z0 = sternZ(shape, y0)
  const z1 = sternZ(shape, y1)
  const rake = Math.atan2(z0 - z1, y1 - y0)
  const chord = 1.3
  return (
    <mesh
      material={m.dark}
      position={[0, (y0 + y1) / 2, (z0 + z1) / 2 - chord / 2]}
      rotation={[-rake, 0, 0]}
      castShadow
    >
      <boxGeometry args={[0.28, Math.hypot(y1 - y0, z1 - z0), chord]} />
    </mesh>
  )
}

/** A stocked anchor hanging from its cathead on each bow. */
export function Anchors({ shape, m }: { shape: ShipShape; m: Mats }) {
  const y = LEVEL.fore + 0.6
  const z = bowZ(shape, y) - 4
  return [1, -1].map((side) => {
    const x = side * (halfBreadth(shape, z, y) + 0.45)
    const hx = side * (halfBreadth(shape, z, y - 2) + 0.5)
    return (
      <group key={side}>
        <mesh material={m.wood} position={[x + side * 0.1, y, z]} castShadow>
          <boxGeometry args={[1.1, 0.26, 0.26]} />
        </mesh>
        <group position={[hx, y - 1.5, z]} rotation={[0, 0, side * 0.08]}>
          <mesh material={m.iron} castShadow>
            <cylinderGeometry args={[0.06, 0.07, 2.6, 6]} />
          </mesh>
          <mesh material={m.wood} position={[0, 1.15, 0]} castShadow>
            <boxGeometry args={[0.14, 0.14, 1.9]} />
          </mesh>
          {[-1, 1].map((a) => (
            <mesh
              key={a}
              material={m.iron}
              position={[0, -1.05, a * 0.42]}
              rotation={[a * -0.75, 0, 0]}
              castShadow
            >
              <boxGeometry args={[0.1, 0.8, 0.12]} />
            </mesh>
          ))}
        </group>
      </group>
    )
  })
}

export interface GangwayPlan {
  side: 1 | -1
  z: number
  /** Outer hull at the main deck, where the plank meets the ship. */
  x: number
  reach: number
  drop: number
}

export function gangwayPlan(
  shape: ShipShape,
  z: number,
  side: 1 | -1,
  drop: number,
  reach: number,
) {
  return { side, z, x: side * halfBreadth(shape, z, LEVEL.main), reach, drop }
}

/** A cleated plank from the gangway opening down to the shore, with rope rails on stanchions. */
export function Gangway({ plan, m }: { plan: GangwayPlan; m: Mats }) {
  const { reach, drop } = plan
  const len = Math.hypot(reach, drop)
  const tilt = Math.atan2(drop, reach)
  const w = GANGWAY.width
  const parts = useMemo(() => {
    const cleat = new BoxGeometry(0.05, 0.04, w * 0.9)
    const cleats: Matrix4[] = []
    for (let d = 0.3; d < len - 0.2; d += 0.4) cleats.push(matrix([d, 0.02, 0]))
    const post = new CylinderGeometry(0.03, 0.03, 1, 5)
    const posts: Matrix4[] = []
    const n = Math.max(2, Math.round(len / 1.5) + 1)
    for (let i = 0; i < n; i++)
      for (const s of [-1, 1]) posts.push(matrix([(len * i) / (n - 1), 0.5, s * (w / 2 - 0.03)]))
    return { cleat, cleats, post, posts }
  }, [len, w])
  return (
    <group position={[plan.x, LEVEL.main, plan.z]} rotation={[0, plan.side > 0 ? 0 : Math.PI, 0]}>
      <group rotation={[0, 0, -tilt]}>
        <mesh material={m.wood} position={[len / 2, -0.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[len, 0.1, w]} />
        </mesh>
        <Instanced geometry={parts.cleat} material={m.dark} matrices={parts.cleats} />
        <Instanced geometry={parts.post} material={m.wood} matrices={parts.posts} />
        {[-1, 1].map((s) => (
          <mesh
            key={s}
            material={m.rope}
            position={[len / 2, 0.98, s * (w / 2 - 0.03)]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.018, 0.018, len, 4]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** The plank, its rails, and a sill bridging the hull's thickness to the deck. */
export function GangwayColliders({ plan }: { plan: GangwayPlan }) {
  const { reach, drop } = plan
  const len = Math.hypot(reach, drop)
  const tilt = Math.atan2(drop, reach)
  const w = GANGWAY.width
  return (
    <group position={[plan.x, LEVEL.main, plan.z]} rotation={[0, plan.side > 0 ? 0 : Math.PI, 0]}>
      <CuboidCollider args={[0.3, 0.075, w / 2]} position={[-0.25, -0.075, 0]} />
      <group rotation={[0, 0, -tilt]}>
        <CuboidCollider args={[len / 2, 0.05, w / 2]} position={[len / 2, -0.05, 0]} />
        {[-1, 1].map((s) => (
          <CuboidCollider
            key={s}
            args={[len / 2, 0.5, 0.03]}
            position={[len / 2, 0.5, s * (w / 2 + 0.03)]}
          />
        ))}
      </group>
    </group>
  )
}
