import { useMaterials, useWorld, type WorldComponentProps } from '@runek/core'
import { useMemo } from 'react'
import { Quaternion, Vector3 } from 'three'

export interface MicStandProps extends WorldComponentProps {
  /** To the middle of the mic's grille, in units. Defaults to 1.6, a standing singer's mouth,
   *  or 1.25 on a boom, a seated player's. */
  height?: number
  /** Hold the mic on a boom arm reaching toward local +Z, instead of straight up. */
  boom?: boolean
}

const UP = new Vector3(0, 1, 0)
const FRONT = new Vector3(0, 0, 1)
const HANDLE = 0.17

/** A cylinder's centre, turn and length to run from `a` to `b`. */
function strut(a: Vector3, b: Vector3) {
  const d = b.clone().sub(a)
  return {
    position: a.clone().add(b).multiplyScalar(0.5).toArray(),
    quaternion: new Quaternion().setFromUnitVectors(UP, d.clone().normalize()),
    length: d.length(),
  }
}

/**
 * A vocal microphone on a tripod stand: three splayed legs, a pole, and a mic with a round
 * grille, held straight up and tipped toward local +Z, or on a `boom` arm with a counterweight
 * that reaches out over a seated player. Decorative: no collider.
 */
export function MicStand({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  height,
  boom = false,
}: MicStandProps) {
  const { unit: u } = useWorld()
  const m = useMaterials({
    dark: { color: '#1d1d1f', roughness: 0.5 },
    chrome: { color: '#c9ccd1', roughness: 0.3, metalness: 0.8 },
  })
  const H = height ?? (boom ? 1.25 : 1.6)

  const parts = useMemo(() => {
    const v = (x: number, y: number, z: number) => new Vector3(x * u, y * u, z * u)
    const hub = v(0, 0.28, 0)
    const legs = [0, 1, 2].map((i) => {
      const a = (i * 2 * Math.PI) / 3 + Math.PI
      return strut(hub, v(Math.sin(a) * 0.32, 0.01, Math.cos(a) * 0.32))
    })
    let top: Vector3
    let arm: ReturnType<typeof strut> | null = null
    let weight: Vector3 | null = null
    let mic: Vector3
    let aim: Vector3
    if (boom) {
      top = v(0, Math.max(0.6, H - 0.35), 0)
      const tip = top.clone().add(v(0, H - top.y / u + 0.06, 0.7))
      const dir = tip.clone().sub(top).normalize()
      weight = top.clone().addScaledVector(dir, -0.3 * u)
      arm = strut(weight, tip)
      mic = tip
      aim = new Vector3(0, -0.4, 1).normalize()
    } else {
      aim = new Vector3(0, Math.cos(0.35), Math.sin(0.35))
      top = v(0, H - HANDLE * aim.y - 0.02, 0)
      mic = top.clone().add(v(0, 0.02, 0))
    }
    const grille = mic.clone().addScaledVector(aim, HANDLE * u)
    return {
      legs,
      pole: strut(v(0, 0.2, 0), top),
      top,
      arm,
      weight,
      handle: strut(mic, grille.clone().addScaledVector(aim, -0.02 * u)),
      grille: grille.toArray(),
      band: grille
        .clone()
        .addScaledVector(aim, -0.012 * u)
        .toArray(),
      aim: new Quaternion().setFromUnitVectors(FRONT, aim),
    }
  }, [H, boom, u])

  return (
    <group position={position} rotation={rotation}>
      {parts.legs.map((leg) => (
        <mesh
          key={leg.position.join()}
          material={m.dark}
          position={leg.position}
          quaternion={leg.quaternion}
          castShadow
        >
          <cylinderGeometry args={[0.009 * u, 0.009 * u, leg.length, 6]} />
        </mesh>
      ))}
      <mesh
        material={m.dark}
        position={parts.pole.position}
        quaternion={parts.pole.quaternion}
        castShadow
      >
        <cylinderGeometry args={[0.013 * u, 0.016 * u, parts.pole.length, 8]} />
      </mesh>
      <mesh material={m.chrome} position={parts.top.toArray()}>
        <sphereGeometry args={[0.024 * u, 10, 8]} />
      </mesh>
      {parts.arm && parts.weight && (
        <>
          <mesh
            material={m.dark}
            position={parts.arm.position}
            quaternion={parts.arm.quaternion}
            castShadow
          >
            <cylinderGeometry args={[0.01 * u, 0.01 * u, parts.arm.length, 6]} />
          </mesh>
          <mesh
            material={m.chrome}
            position={parts.weight.toArray()}
            quaternion={parts.arm.quaternion}
          >
            <cylinderGeometry args={[0.03 * u, 0.03 * u, 0.09 * u, 12]} />
          </mesh>
        </>
      )}
      <mesh
        material={m.dark}
        position={parts.handle.position}
        quaternion={parts.handle.quaternion}
        castShadow
      >
        <cylinderGeometry args={[0.019 * u, 0.013 * u, parts.handle.length, 12]} />
      </mesh>
      <mesh material={m.chrome} position={parts.grille} castShadow>
        <sphereGeometry args={[0.028 * u, 14, 10]} />
      </mesh>
      <mesh material={m.dark} position={parts.band} quaternion={parts.aim}>
        <torusGeometry args={[0.026 * u, 0.003 * u, 6, 20]} />
      </mesh>
    </group>
  )
}

MicStand.groundSitting = true
