import { RoundedBox } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { pick, rng, sub, useWorld, type WorldComponentProps } from '@runek/core'
import { useMemo } from 'react'

/** Freezer drawer on `top` or `bottom`, or a `single` full-height door. */
export type FridgeLayout = 'top' | 'bottom' | 'single'

export interface FridgeProps extends WorldComponentProps {
  width?: number
  height?: number
  depth?: number
  /** Seeded when unset. */
  layout?: FridgeLayout
  /** Body color. Seeded between an enamel white and brushed steel when unset. */
  color?: string
  /** Handles; defaults to the palette's `metal`. */
  handleColor?: string
}

const FINISHES = ['#ecebe7', '#ecebe7', '#b9bdc1', '#e4ded2']

/**
 * A kitchen fridge: a rounded cabinet with its door split for a freezer (top or bottom) or one
 * tall door, long bar handles on the opening side, and a kick plate. Doors face local +Z. One
 * cuboid collider.
 */
export function Fridge({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  width = 0.7,
  height = 1.8,
  depth = 0.68,
  layout,
  color,
  handleColor,
}: FridgeProps) {
  const { unit, palette } = useWorld()
  const W = width * unit
  const H = height * unit
  const D = depth * unit
  const metal = handleColor ?? palette.metal

  const look = useMemo(() => {
    const r = rng(sub(seed, 0))
    const rolled = {
      layout: pick<FridgeLayout>(r, ['top', 'bottom', 'bottom', 'single']),
      finish: pick(r, FINISHES),
      right: r() < 0.5,
    }
    return {
      layout: layout ?? rolled.layout,
      body: color ?? rolled.finish,
      // Handles go on the side the door opens from.
      side: rolled.right ? 1 : -1,
    }
  }, [seed, layout, color])

  const kick = 0.06 * unit
  const gap = 0.008 * unit
  const doorT = 0.04 * unit
  const usable = H - kick
  const split =
    look.layout === 'top'
      ? kick + usable * 0.7
      : look.layout === 'bottom'
        ? kick + usable * 0.33
        : 0
  // Doors as [bottom, top] spans in Y.
  const doors: [number, number][] = split
    ? [
        [kick + gap, split - gap / 2],
        [split + gap / 2, H - gap],
      ]
    : [[kick + gap, H - gap]]
  const hx = look.side * (W / 2 - 0.06 * unit)

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[W / 2, H / 2, D / 2]} position={[0, H / 2, 0]} />
      <RoundedBox
        args={[W, H - kick, D - doorT]}
        radius={0.02 * unit}
        smoothness={2}
        position={[0, kick + (H - kick) / 2, -doorT / 2]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={look.body} roughness={0.35} metalness={0.15} />
      </RoundedBox>
      <mesh position={[0, kick / 2, -0.03 * unit]}>
        <boxGeometry args={[W - 0.04 * unit, kick, D - 0.08 * unit]} />
        <meshStandardMaterial color="#2a2a2c" roughness={0.8} />
      </mesh>
      {doors.map(([y0, y1]) => {
        const h = y1 - y0
        // A short freezer door gets a horizontal handle along its top edge; tall doors a long bar.
        const short = h < usable * 0.4
        return (
          <group key={y0} position={[0, (y0 + y1) / 2, D / 2 - doorT / 2]}>
            <RoundedBox
              args={[W - 0.01 * unit, h, doorT]}
              radius={0.015 * unit}
              smoothness={2}
              castShadow
            >
              <meshStandardMaterial color={look.body} roughness={0.3} metalness={0.15} />
            </RoundedBox>
            {(short
              ? [-1, 1].map((k) => [
                  k * W * 0.28,
                  (look.layout === 'bottom' ? 1 : -1) * (h / 2 - 0.06 * unit),
                ])
              : [-1, 1].map((k) => [hx, ((k * Math.min(h * 0.55, 0.6 * unit)) / 2) * 0.9])
            ).map(([px, py]) => (
              <mesh key={`${px}:${py}`} position={[px, py, doorT / 2 + 0.0125 * unit]}>
                <boxGeometry args={[0.014 * unit, 0.014 * unit, 0.025 * unit]} />
                <meshStandardMaterial color={metal} roughness={0.25} metalness={0.8} />
              </mesh>
            ))}
            {short ? (
              <mesh
                position={[
                  0,
                  (look.layout === 'bottom' ? 1 : -1) * (h / 2 - 0.06 * unit),
                  doorT / 2 + 0.025 * unit,
                ]}
                rotation={[0, 0, Math.PI / 2]}
                castShadow
              >
                <cylinderGeometry args={[0.012 * unit, 0.012 * unit, W * 0.6, 10]} />
                <meshStandardMaterial color={metal} roughness={0.25} metalness={0.8} />
              </mesh>
            ) : (
              <mesh position={[hx, 0, doorT / 2 + 0.025 * unit]} castShadow>
                <cylinderGeometry
                  args={[0.012 * unit, 0.012 * unit, Math.min(h * 0.55, 0.6 * unit), 10]}
                />
                <meshStandardMaterial color={metal} roughness={0.25} metalness={0.8} />
              </mesh>
            )}
          </group>
        )
      })}
    </RigidBody>
  )
}

Fridge.groundSitting = true
