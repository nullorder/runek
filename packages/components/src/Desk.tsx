import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { pick, rng, sub, useWorld, type Vec3, type WorldComponentProps } from '@runek/core'
import { useMemo } from 'react'

/** What holds the top up: four slim `legs`, a drawer `pedestal` on one side, or solid side
 *  `panels`. */
export type DeskBase = 'legs' | 'pedestal' | 'panels'

export interface DeskProps extends WorldComponentProps {
  /** Width along local X, in units. */
  width?: number
  /** Depth along local Z, in units. The front, where you sit, faces +Z. */
  depth?: number
  /** Height of the work surface, in units. */
  height?: number
  /** Seeded when unset. */
  base?: DeskBase
  /** Drawers in the pedestal, 0 to 4. Seeded when unset; only a `pedestal` desk has them. */
  drawers?: number
  /** Top color; defaults to the palette's `wood`. */
  color?: string
  /** Legs, pedestal, and panels; defaults to the palette's `metal` for legs, else `woodDark`. */
  baseColor?: string
}

interface Box {
  pos: Vec3
  size: Vec3
  color: string
  rough: number
}

const BASES: DeskBase[] = ['legs', 'pedestal', 'panels']

/**
 * A work desk: a top over legs, a drawer pedestal, or side panels, with a modesty panel at the back
 * (local -Z). The base and drawer count come from the seed unless you pin them. One cuboid
 * collider for the whole desk. Pair with a `Monitor` on top and a `Chair` at the front.
 */
export function Desk({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  width = 1.4,
  depth = 0.7,
  height = 0.75,
  base,
  drawers,
  color,
  baseColor,
}: DeskProps) {
  const { unit, palette } = useWorld()
  const W = width * unit
  const D = depth * unit
  const H = height * unit

  const boxes = useMemo<Box[]>(() => {
    // Every roll is drawn before overrides apply, so pinning one prop never reshuffles another.
    const r = rng(sub(seed, 0))
    const rolled = { base: pick(r, BASES), drawers: pick(r, [2, 3, 3, 4]), left: r() < 0.5 }
    const kind = base ?? rolled.base
    const count = Math.min(Math.max(Math.round(drawers ?? rolled.drawers), 0), 4)
    const pedestalLeft = rolled.left
    const top = color ?? palette.wood
    const frame = baseColor ?? (kind === 'legs' ? palette.metal : palette.woodDark)
    const t = 0.035 * unit
    const legH = H - t
    const out: Box[] = [{ pos: [0, H - t / 2, 0], size: [W, t, D], color: top, rough: 0.6 }]
    const add = (pos: Vec3, size: Vec3, c = frame, rough = 0.7) =>
      out.push({ pos, size, color: c, rough })

    // Modesty panel across the back, up from knee height.
    const panelH = legH * 0.55
    add([0, legH - panelH / 2, -D / 2 + 0.03 * unit], [W - 0.08 * unit, panelH, 0.018 * unit])

    const side = (sx: number) => {
      const th = 0.03 * unit
      add([sx * (W / 2 - th / 2 - 0.01 * unit), legH / 2, 0], [th, legH, D - 0.02 * unit])
    }
    if (kind === 'legs') {
      const leg = 0.04 * unit
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          add(
            [sx * (W / 2 - leg / 2 - 0.03 * unit), legH / 2, sz * (D / 2 - leg / 2 - 0.03 * unit)],
            [leg, legH, leg],
            frame,
            0.4,
          )
    } else if (kind === 'panels') {
      side(-1)
      side(1)
    } else {
      // A drawer pedestal on one side, a panel leg on the other.
      const sx = pedestalLeft ? -1 : 1
      const pw = Math.min(0.42 * unit, W * 0.36)
      const px = sx * (W / 2 - pw / 2 - 0.01 * unit)
      const pd = D - 0.06 * unit
      add([px, legH / 2, -0.02 * unit], [pw, legH, pd])
      side(-sx)
      if (count > 0) {
        const gap = 0.012 * unit
        const fh = (legH - 0.06 * unit - gap * (count + 1)) / count
        for (let i = 0; i < count; i++) {
          const y = 0.06 * unit + gap * (i + 1) + fh * (i + 0.5)
          const z = -0.02 * unit + pd / 2
          add([px, y, z + 0.006 * unit], [pw - 0.03 * unit, fh, 0.012 * unit], top, 0.6)
          add(
            [px, y + fh * 0.28, z + 0.02 * unit],
            [pw * 0.4, 0.014 * unit, 0.014 * unit],
            palette.metal,
            0.35,
          )
        }
      }
    }
    return out
  }, [seed, base, drawers, color, baseColor, palette, unit, W, D, H])

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[W / 2, H / 2, D / 2]} position={[0, H / 2, 0]} />
      {boxes.map((b) => (
        <mesh
          key={`${b.pos[0].toFixed(3)}:${b.pos[1].toFixed(3)}:${b.pos[2].toFixed(3)}`}
          position={b.pos}
          castShadow
          receiveShadow
        >
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={b.color} roughness={b.rough} />
        </mesh>
      ))}
    </RigidBody>
  )
}

Desk.groundSitting = true
