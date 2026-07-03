import { RigidBody } from '@react-three/rapier'
import { useWorld, type WorldComponentProps } from '@runek/core'
import { useEffect, useMemo } from 'react'
import { CylinderGeometry } from 'three'

export interface CliffProps extends WorldComponentProps {
  /** Base radius at the waterline, in units. */
  radius?: number
  /** Plateau (top) radius, in units. */
  topRadius?: number
  /** Height from the base to the plateau, in units. */
  height?: number
  /** Radial facets — fewer reads as blockier rock. */
  segments?: number
  /** Surface jitter, as a fraction of a facet. */
  rough?: number
  /** Rock color; defaults to the palette's `stone`. */
  color?: string
}

/**
 * A rocky promontory: a low-poly truncated cone, vertex-jittered by `seed`, rising from the
 * waterline to a flattish plateau you can stand on. A convex-hull collider blocks the steep sides
 * and carries the top. Sink the base below the water in placement so it reads as rising from the
 * sea. (Convex — true overhangs aren't modelled.)
 */
export function Cliff({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  radius = 10,
  topRadius = 6,
  height = 12,
  segments = 8,
  rough = 0.35,
  color,
}: CliffProps) {
  const { unit, palette } = useWorld()
  const rock = color ?? palette.stone
  const R = radius * unit
  const Rt = topRadius * unit
  const Hgt = height * unit

  const geometry = useMemo(() => {
    const g = new CylinderGeometry(Rt, R, Hgt, segments, 3, false)
    g.translate(0, Hgt / 2, 0) // base at local y=0
    const amp = rough * (R / segments)
    // Jitter keyed on vertex position (not draw order): the cylinder's cap and wall duplicate
    // vertices at the same location, and independent offsets would tear cracks between them.
    const jitter = (x: number, y: number, z: number, k: number) => {
      let h =
        (seed ^
          Math.imul(Math.round(x * 64), 374761393) ^
          Math.imul(Math.round(y * 64), 668265263) ^
          Math.imul(Math.round(z * 64), 1274126177) ^
          Math.imul(k + 1, 2246822519)) >>>
        0
      h = Math.imul(h ^ (h >>> 13), 1274126177)
      return (((h ^ (h >>> 16)) >>> 0) / 4294967296) * 2 - 1
    }
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      const top = y > Hgt - 0.01 // keep the plateau roughly flat for standing
      pos.setX(i, x + jitter(x, y, z, 0) * amp)
      pos.setZ(i, z + jitter(x, y, z, 1) * amp)
      pos.setY(i, y + jitter(x, y, z, 2) * amp * (top ? 0.1 : 0.5))
    }
    pos.needsUpdate = true
    g.computeVertexNormals()
    return g
  }, [R, Rt, Hgt, segments, rough, seed])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <RigidBody type="fixed" colliders="hull" position={position} rotation={rotation}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color={rock} roughness={1} flatShading />
      </mesh>
    </RigidBody>
  )
}
