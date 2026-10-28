import { range, rng, useMaterials, useWorld, type WorldComponentProps } from '@runek/core'
import { useEffect, useMemo } from 'react'
import { BackSide, SphereGeometry } from 'three'

export interface CaveProps extends WorldComponentProps {
  /** Radius of the hollow, in units. */
  radius?: number
  /** Height of the vault over the origin, in units. */
  height?: number
  /** How wide the mouth is, in radians round the vault. */
  mouth?: number
  /** Rock. Defaults to the world palette's `stone` slot, as `Cliff` does. */
  color?: string
}

/**
 * A hollow in rock opening toward local +Z: a vault of faceted stone, roughened from the seed,
 * dark inside, with its mouth cut from the floor up and a few boulders fallen either side. Set
 * it into the foot of a `Cliff` at the waterline and the sea runs in. Decorative: no collider,
 * so a boat or a swimmer can go in.
 */
export function Cave({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  radius = 3.5,
  height = 3.2,
  mouth = 1.1,
  color,
}: CaveProps) {
  const { unit, palette } = useWorld()
  const m = useMaterials({
    rock: { color: color ?? palette.stone, roughness: 1, flatShading: true },
    inside: { color: '#14161a', roughness: 1, side: BackSide },
  })
  const R = radius * unit
  const H = height * unit

  const { shell, boulders } = useMemo(() => {
    const next = rng(seed)
    const geometry = new SphereGeometry(
      R,
      20,
      10,
      Math.PI / 2 + mouth / 2,
      Math.PI * 2 - mouth,
      0,
      Math.PI / 2,
    )
    const p = geometry.attributes.position
    // One seeded push per position, shared by the vertices that meet there, so seams stay closed.
    const bumps = new Map<string, number>()
    for (let i = 0; i < p.count; i++) {
      const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`
      let k = bumps.get(key)
      if (k === undefined) {
        k = 1 + range(next, -0.12, 0.14)
        bumps.set(key, k)
      }
      p.setXYZ(i, p.getX(i) * k, (p.getY(i) / R) * H * k, p.getZ(i) * k)
    }
    geometry.computeVertexNormals()
    const stones = Array.from({ length: 6 }, (_, i) => {
      const side = i % 2 === 0 ? 1 : -1
      const a = mouth / 2 + range(next, 0.05, 0.35)
      const r = R * range(next, 0.95, 1.2)
      return {
        x: side * Math.sin(a) * r,
        z: Math.cos(a) * r,
        size: range(next, 0.35, 0.8) * unit,
        spin: range(next, 0, Math.PI),
      }
    })
    return { shell: geometry, boulders: stones }
  }, [seed, R, H, mouth, unit])

  useEffect(() => () => shell.dispose(), [shell])

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={shell} material={m.rock} castShadow receiveShadow />
      <mesh geometry={shell} material={m.inside} scale={0.97} />
      {boulders.map((b) => (
        <mesh
          key={`${b.x},${b.z}`}
          material={m.rock}
          castShadow
          position={[b.x, b.size * 0.4, b.z]}
          rotation={[b.spin, b.spin * 0.7, 0]}
        >
          <dodecahedronGeometry args={[b.size, 0]} />
        </mesh>
      ))}
    </group>
  )
}
