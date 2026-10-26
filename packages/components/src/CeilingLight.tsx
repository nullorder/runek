import {
  pick,
  range,
  rng,
  sub,
  useLight,
  useMaterials,
  useSun,
  useWorld,
  type WorldComponentProps,
} from '@runek/core'
import { useMemo } from 'react'
import { DoubleSide } from 'three'

/** Close to the ceiling (`flush`), hanging on a cord (`pendant`), or an aimed can (`spot`). */
export type CeilingLightKind = 'flush' | 'pendant' | 'spot'
/** The pendant's shade. */
export type CeilingLightShade = 'dome' | 'cone' | 'drum' | 'globe'

export interface CeilingLightProps extends WorldComponentProps {
  /** Seeded when unset. */
  kind?: CeilingLightKind
  /** Pendant only; seeded when unset. */
  shade?: CeilingLightShade
  /** Pendant cord length from the ceiling to the shade, in units. */
  drop?: number
  /** Shade size across, in units. */
  size?: number
  /** Canopy, cord, and can; defaults to the palette's `metal`. */
  color?: string
  /** The shade. Seeded when unset. */
  shadeColor?: string
  /** The light and the glowing bulb. */
  lightColor?: string
  /** Light strength. */
  intensity?: number
  /** Switched on. */
  on?: boolean
  /** Light only while the world's sun is down. */
  nightOnly?: boolean
}

const KINDS: CeilingLightKind[] = ['flush', 'pendant', 'pendant', 'spot']
const SHADES: CeilingLightShade[] = ['dome', 'cone', 'drum', 'globe']
const SHADE_COLORS = ['#e9e4d8', '#2f3a35', '#b8743f', '#d9c27a', '#1f2a44']

/**
 * A ceiling fitting, its origin at the ceiling with the fitting hanging below (local -Y): a
 * frosted `flush` dome, a `pendant` shade on a cord, or a `spot` can throwing a cone of light
 * down. `nightOnly` switches it on with the world's dusk. Decorative: no collider.
 */
export function CeilingLight({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  kind,
  shade,
  drop = 0.6,
  size = 0.36,
  color,
  shadeColor,
  lightColor = '#ffe2b8',
  intensity = 12,
  on = true,
  nightOnly = false,
}: CeilingLightProps) {
  const { unit, palette } = useWorld()
  const sun = useSun()
  const lit = on && (!nightOnly || !sun.day)
  const metal = color ?? palette.metal
  const R = (size / 2) * unit

  const look = useMemo(() => {
    const r = rng(sub(seed, 0))
    return {
      kind: kind ?? pick(r, KINDS),
      shade: shade ?? pick(r, SHADES),
      shadeColor: shadeColor ?? pick(r, SHADE_COLORS),
      tilt: range(r, -0.25, 0.25),
    }
  }, [seed, kind, shade, shadeColor])

  const m = useMaterials({
    metal: { color: metal, metalness: 0.5, roughness: 0.4 },
    can: { color: metal, metalness: 0.5, roughness: 0.4, side: DoubleSide },
    cord: { color: metal },
    bulb: {
      color: '#fff6e0',
      emissive: lightColor,
      emissiveIntensity: lit ? 2 : 0,
      toneMapped: !lit,
    },
    globe: {
      color: look.shadeColor,
      emissive: lightColor,
      emissiveIntensity: lit ? 0.9 : 0,
      transparent: true,
      opacity: 0.92,
    },
    shade: { color: look.shadeColor, roughness: 0.5, metalness: 0.2, side: DoubleSide },
  })
  const spot = look.kind === 'spot'
  const glow = useLight(
    {
      kind: spot ? 'spot' : 'point',
      color: lightColor,
      intensity: spot ? intensity * 2 : intensity,
      distance: (spot ? 12 : 10) * unit,
      decay: 2,
      angle: 0.5,
      penumbra: 0.6,
    },
    lit,
  )
  const canopy = (
    <mesh material={m.metal} position={[0, -0.015 * unit, 0]}>
      <cylinderGeometry args={[0.06 * unit, 0.07 * unit, 0.03 * unit, 16]} />
    </mesh>
  )

  if (look.kind === 'flush') {
    return (
      <group position={position} rotation={rotation}>
        <mesh material={m.metal} position={[0, -0.01 * unit, 0]}>
          <cylinderGeometry args={[R * 1.05, R * 1.05, 0.02 * unit, 28]} />
        </mesh>
        <mesh
          material={m.bulb}
          position={[0, -0.02 * unit, 0]}
          scale={[1, 0.45, 1]}
          rotation={[Math.PI, 0, 0]}
        >
          <sphereGeometry args={[R, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <object3D ref={glow.ref} position={[0, -R * 0.6, 0]} />
      </group>
    )
  }

  if (look.kind === 'spot') {
    const canL = 0.14 * unit
    return (
      <group position={position} rotation={rotation}>
        {canopy}
        <group position={[0, -0.04 * unit, 0]} rotation={[look.tilt, 0, 0]}>
          <mesh material={m.can} position={[0, -canL / 2, 0]} castShadow>
            <cylinderGeometry args={[0.05 * unit, 0.045 * unit, canL, 18, 1, true]} />
          </mesh>
          <mesh
            material={m.bulb}
            position={[0, -canL + 0.01 * unit, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[0.04 * unit, 18]} />
          </mesh>
          <object3D ref={glow.target} position={[0, -3 * unit, 0]} />
          <object3D ref={glow.ref} position={[0, -canL, 0]} />
        </group>
      </group>
    )
  }

  const D = drop * unit
  const dome = look.shade === 'dome'
  const shadeH = dome ? R : (look.shade === 'drum' ? 0.7 : 0.8) * R * 2
  return (
    <group position={position} rotation={rotation}>
      {canopy}
      <mesh material={m.cord} position={[0, -D / 2, 0]}>
        <cylinderGeometry args={[0.003 * unit, 0.003 * unit, D, 5]} />
      </mesh>
      <group position={[0, -D, 0]}>
        {look.shade === 'globe' ? (
          <mesh material={m.globe} position={[0, -R, 0]}>
            <sphereGeometry args={[R, 24, 16]} />
          </mesh>
        ) : (
          <mesh material={m.shade} position={[0, dome ? -R : -shadeH / 2, 0]} castShadow>
            {dome ? (
              <sphereGeometry args={[R, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            ) : look.shade === 'cone' ? (
              <cylinderGeometry args={[R * 0.12, R, shadeH, 24, 1, true]} />
            ) : (
              <cylinderGeometry args={[R, R, shadeH, 24, 1, true]} />
            )}
          </mesh>
        )}
        {look.shade !== 'globe' && (
          <mesh material={m.bulb} position={[0, -shadeH * 0.8, 0]}>
            <sphereGeometry args={[0.035 * unit, 12, 8]} />
          </mesh>
        )}
        <object3D ref={glow.ref} position={[0, -shadeH, 0]} />
      </group>
    </group>
  )
}
