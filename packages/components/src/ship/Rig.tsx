import { useEffect, useMemo } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  LineBasicMaterial,
  type Material,
  Quaternion,
  Vector3,
} from 'three'
import { LEVEL, type ShipLayout } from '../surfaces/ship'
import type { V3 } from './mesh'
import { buildRigging, buildSails, type Rig as RigPlan, type SailPlan } from './rigging'

const UP = new Vector3(0, 1, 0)

/** A round spar between two points, tapering from `r0` to `r1`. */
function Spar({
  from,
  to,
  r0,
  r1,
  material,
}: {
  from: V3
  to: V3
  r0: number
  r1: number
  material: Material
}) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new Vector3(...from)
    const b = new Vector3(...to)
    const dir = b.clone().sub(a)
    return {
      position: a.add(b).multiplyScalar(0.5),
      quaternion: new Quaternion().setFromUnitVectors(UP, dir.clone().normalize()),
      length: dir.length(),
    }
  }, [from, to])
  return (
    <mesh material={material} position={position} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[r1, r0, length, 8]} />
    </mesh>
  )
}

export function Rig({
  lay,
  rig,
  sails,
  seed,
  spar,
  sail,
  rope,
}: {
  lay: ShipLayout
  rig: RigPlan
  sails: SailPlan
  seed: number
  spar: Material
  sail: Material
  rope: string
}) {
  const cloth = useMemo(() => (sails === 'set' ? buildSails(rig, seed) : null), [rig, sails, seed])
  const lines = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(buildRigging(lay, rig), 3))
    return g
  }, [lay, rig])
  const lineMaterial = useMemo(() => new LineBasicMaterial({ color: rope }), [rope])
  useEffect(() => () => cloth?.dispose(), [cloth])
  useEffect(() => () => lines.dispose(), [lines])
  useEffect(() => () => lineMaterial.dispose(), [lineMaterial])
  const { base, tip } = rig.bowsprit
  const sp = rig.spanker
  return (
    <>
      {rig.masts.map((m) => {
        const k = m.r / 0.45
        return (
          <group key={m.key}>
            <Spar
              from={[0, LEVEL.hold, m.z]}
              to={[0, m.top + 0.8, m.z]}
              r0={m.r}
              r1={m.r * 0.78}
              material={spar}
            />
            <Spar
              from={[0, m.top - 0.6, m.z]}
              to={[0, m.cross + 0.7, m.z]}
              r0={m.r * 0.55}
              r1={m.r * 0.42}
              material={spar}
            />
            <Spar
              from={[0, m.cross - 0.6, m.z]}
              to={[0, m.truck, m.z]}
              r0={m.r * 0.34}
              r1={m.r * 0.2}
              material={spar}
            />
            <mesh material={spar} position={[0, m.top, m.z - 0.1]} castShadow>
              <boxGeometry args={[m.topHalf * 2, 0.14, 1.7 * k]} />
            </mesh>
            <mesh material={spar} position={[0, m.cross, m.z]}>
              <boxGeometry args={[1.5 * k, 0.1, 0.9 * k]} />
            </mesh>
            <mesh material={spar} position={[0, m.truck + 0.08, m.z]}>
              <cylinderGeometry args={[0.14 * k, 0.14 * k, 0.16, 10]} />
            </mesh>
            {m.yards.map((yd) => (
              <group key={yd.y} position={[0, yd.y, m.z + m.r + 0.1]}>
                <mesh material={spar} rotation={[0, 0, Math.PI / 2]} castShadow>
                  <cylinderGeometry args={[0.1 * k, 0.17 * k, yd.half * 2, 8]} />
                </mesh>
                {sails === 'furled' && yd.sail && (
                  <mesh
                    material={sail}
                    position={[0, 0.12, 0.22]}
                    rotation={[0, 0, Math.PI / 2]}
                    castShadow
                  >
                    <cylinderGeometry args={[0.22 * k, 0.22 * k, yd.half * 1.84, 8]} />
                  </mesh>
                )}
              </group>
            ))}
          </group>
        )
      })}
      <Spar from={base} to={tip} r0={0.24} r1={0.1} material={spar} />
      {sp && (
        <>
          <Spar from={sp.jaw} to={sp.peak} r0={0.12} r1={0.08} material={spar} />
          <Spar from={sp.tack} to={sp.clew} r0={0.14} r1={0.1} material={spar} />
        </>
      )}
      {cloth && <mesh geometry={cloth} material={sail} castShadow receiveShadow />}
      <lineSegments geometry={lines} material={lineMaterial} />
    </>
  )
}
