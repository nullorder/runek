import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useMaterials, useWorld, type WorldComponentProps } from '@runek/core'
import { useMemo } from 'react'

/** A doorway left open in a `GlassWall`, all in units. */
export interface GlassWallDoor {
  /** From the middle of the wall along X. */
  offset?: number
  width?: number
  height?: number
}

export interface GlassWallProps extends WorldComponentProps {
  /** Length along local X, in units, centred on the origin. */
  width?: number
  height?: number
  /** A doorway left open in it, with a pane over it to the top. */
  door?: GlassWallDoor
  /** Widest a pane runs before a mullion, in units. */
  pane?: number
  /** Glass tint. */
  glassColor?: string
  /** How much the glass hides, 0 clear to 1 opaque. Dark and high makes a smoked partition. */
  opacity?: number
  /** Frame and mullions. Defaults to the world palette's `metal` slot. */
  color?: string
}

const FRAME = 0.05

/**
 * A floor-to-ceiling glass wall for an office or a meeting room: panes between slim mullions in
 * a frame along local X, with a doorway left open where `door` says. The straight, indoor
 * sibling of `CurvedWall`'s glass. A cuboid collider either side of the doorway.
 */
export function GlassWall({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 4,
  height = 3,
  door,
  pane = 1.2,
  glassColor = '#b7d8e8',
  opacity = 0.22,
  color,
}: GlassWallProps) {
  const { unit, palette } = useWorld()
  const m = useMaterials({
    glass: { color: glassColor, transparent: true, opacity, roughness: 0.06 },
    steel: { color: color ?? palette.metal, roughness: 0.4, metalness: 0.5 },
  })
  const W = width * unit
  const H = height * unit
  const f = FRAME * unit
  const doorW = door ? (door.width ?? 1) * unit : 0
  const doorH = door ? (door.height ?? 2.2) * unit : 0
  const doorX = door ? (door.offset ?? 0) * unit : 0

  const { runs, mullions } = useMemo(() => {
    // The solid stretches either side of the doorway, as [left, right] along X.
    const spans: [number, number][] = doorW
      ? [
          [-W / 2, doorX - doorW / 2],
          [doorX + doorW / 2, W / 2],
        ]
      : [[-W / 2, W / 2]]
    const solid = spans.filter(([a, b]) => b - a > 1e-3)
    const xs: number[] = []
    for (const [a, b] of solid) {
      const n = Math.max(1, Math.ceil((b - a) / (pane * unit)))
      for (let i = 0; i <= n; i++) xs.push(a + ((b - a) * i) / n)
    }
    return { runs: solid, mullions: xs }
  }, [W, doorW, doorX, pane, unit])

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      {runs.map(([a, b]) => (
        <CuboidCollider
          key={`c${a}`}
          args={[(b - a) / 2, H / 2, 0.04 * unit]}
          position={[(a + b) / 2, H / 2, 0]}
        />
      ))}
      {runs.map(([a, b]) => (
        <mesh key={`g${a}`} material={m.glass} position={[(a + b) / 2, H / 2, 0]}>
          <boxGeometry args={[b - a, H - f * 2, 0.012 * unit]} />
        </mesh>
      ))}
      {doorW > 0 && H - doorH > f * 2 && (
        <mesh material={m.glass} position={[doorX, (doorH + H) / 2, 0]}>
          <boxGeometry args={[doorW, H - doorH - f, 0.012 * unit]} />
        </mesh>
      )}
      {doorW > 0 && (
        <mesh material={m.steel} castShadow position={[doorX, doorH + f / 2, 0]}>
          <boxGeometry args={[doorW, f, f]} />
        </mesh>
      )}
      <mesh material={m.steel} castShadow position={[0, H - f / 2, 0]}>
        <boxGeometry args={[W, f, f * 1.2]} />
      </mesh>
      {runs.map(([a, b]) => (
        <mesh
          key={`t${a}`}
          material={m.steel}
          castShadow
          receiveShadow
          position={[(a + b) / 2, f / 2, 0]}
        >
          <boxGeometry args={[b - a, f, f * 1.2]} />
        </mesh>
      ))}
      {mullions.map((x) => (
        <mesh key={`m${x}`} material={m.steel} castShadow position={[x, H / 2, 0]}>
          <boxGeometry args={[f * 0.8, H, f]} />
        </mesh>
      ))}
    </RigidBody>
  )
}

GlassWall.groundSitting = true
