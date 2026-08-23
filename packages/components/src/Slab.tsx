import { RigidBody } from '@react-three/rapier'
import { useWorld, type WorldComponentProps } from '@runek/core'
import { useEffect, useMemo } from 'react'
import { ExtrudeGeometry, Shape } from 'three'

export type SlabShape = 'pill' | 'disc'

export interface SlabProps extends WorldComponentProps {
  /** Footprint `[width, depth]`, in units. The top surface sits at the component origin. */
  size?: [number, number]
  /** `pill` is a rounded rectangle, `disc` an ellipse. */
  shape?: SlabShape
  /** Pill corner radius, in units; clamped to half the smaller extent (a full stadium). */
  cornerRadius?: number
  thickness?: number
  /** Curve smoothness of the rounded edges. */
  curveSegments?: number
  /** Defaults to the world palette's `wall` slot. */
  color?: string
}

/**
 * A rounded structural plate: an extruded pill or ellipse you can stack into curved-modernist
 * floor decks, cantilevered roofs, terraces, or a lawn disc. Convex by construction, so a single
 * hull collider carries it. Flat-topped and walkable; the top surface sits at the origin like
 * `Floor`, so decks and their furniture share a Y.
 */
export function Slab({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = [8, 8],
  shape = 'pill',
  cornerRadius,
  thickness = 0.35,
  curveSegments = 24,
  color,
}: SlabProps) {
  const { unit, palette } = useWorld()
  const slabColor = color ?? palette.wall
  const w = size[0] * unit
  const d = size[1] * unit
  const t = thickness * unit
  const r = Math.min((cornerRadius ?? Math.min(size[0], size[1]) / 2) * unit, Math.min(w, d) / 2)

  const geometry = useMemo(() => {
    const outline = new Shape()
    if (shape === 'disc') {
      outline.absellipse(0, 0, w / 2, d / 2, 0, Math.PI * 2, false, 0)
    } else {
      const hw = w / 2
      const hd = d / 2
      outline.moveTo(-hw + r, -hd)
      outline.lineTo(hw - r, -hd)
      outline.absarc(hw - r, -hd + r, r, -Math.PI / 2, 0, false)
      outline.lineTo(hw, hd - r)
      outline.absarc(hw - r, hd - r, r, 0, Math.PI / 2, false)
      outline.lineTo(-hw + r, hd)
      outline.absarc(-hw + r, hd - r, r, Math.PI / 2, Math.PI, false)
      outline.lineTo(-hw, -hd + r)
      outline.absarc(-hw + r, -hd + r, r, Math.PI, Math.PI * 1.5, false)
    }
    const g = new ExtrudeGeometry(outline, { depth: t, bevelEnabled: false, curveSegments })
    g.rotateX(-Math.PI / 2) // shape XY → world XZ, extrusion → up
    g.translate(0, -t, 0) // top surface at the origin
    return g
  }, [shape, w, d, r, t, curveSegments])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <RigidBody type="fixed" colliders="hull" position={position} rotation={rotation}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color={slabColor} />
      </mesh>
    </RigidBody>
  )
}
