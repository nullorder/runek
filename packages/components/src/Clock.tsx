import { useFrame } from '@react-three/fiber'
import { useWorld, type Vec3 } from '@runek/core'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'

export interface ClockProps {
  position?: Vec3
  rotation?: Vec3
  /** Face radius in units. */
  radius?: number
  /**
   * IANA timezone, e.g. "Asia/Kolkata". Omit to track the local system time;
   * if neither resolves, the clock falls back to UTC.
   */
  timezone?: string
  /** Rim/frame color. Defaults to the world palette's `metal` slot. */
  frameColor?: string
  /** Dial color. */
  faceColor?: string
  /** Hour/minute hand and tick color. */
  handColor?: string
  /** Second hand + hub accent. Defaults to the world palette's `accent` slot. */
  accentColor?: string
}

/**
 * Read hours/minutes/seconds for a timezone (or the local clock), with a UTC
 * fallback. The sub-second fraction is timezone-independent, so we add it back
 * for a smooth second-hand sweep.
 */
function readTime(fmt: Intl.DateTimeFormat | null): { h: number; m: number; s: number } {
  const now = new Date()
  const frac = (now.getTime() % 1000) / 1000
  try {
    if (fmt) {
      const part: Record<string, number> = {}
      for (const p of fmt.formatToParts(now)) part[p.type] = Number(p.value)
      const h = part.hour % 24
      if (![h, part.minute, part.second].every(Number.isFinite)) throw new Error('bad zone')
      return { h, m: part.minute, s: part.second + frac }
    }
    const h = now.getHours()
    const m = now.getMinutes()
    const s = now.getSeconds()
    if (![h, m, s].every(Number.isFinite)) throw new Error('no local time')
    return { h, m, s: s + frac }
  } catch {
    return { h: now.getUTCHours(), m: now.getUTCMinutes(), s: now.getUTCSeconds() + frac }
  }
}

/**
 * A procedural analog clock — face, rim, ticks, and three hands, all from code
 * (no fonts or textures). The hands track the system clock, or a given `timezone`.
 * Decorative: it registers no colliders (mount it against a wall that has one).
 */
export function Clock({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  radius = 0.55,
  timezone,
  frameColor,
  faceColor = '#0d1117',
  handColor = '#e8eef5',
  accentColor,
}: ClockProps) {
  const { unit, palette } = useWorld()
  const rim = frameColor ?? palette.metal
  const accent = accentColor ?? palette.accent
  const R = radius * unit

  const fmt = useMemo(
    () =>
      timezone
        ? new Intl.DateTimeFormat('en-GB', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          })
        : null,
    [timezone],
  )

  const ticks = useMemo(() => {
    const inset = R - 0.06 * unit
    return Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2
      return { a, big: i % 3 === 0, x: Math.sin(a) * inset, y: Math.cos(a) * inset }
    })
  }, [R, unit])

  const hour = useRef<Group>(null)
  const minute = useRef<Group>(null)
  const second = useRef<Group>(null)

  useFrame(() => {
    const { h, m, s } = readTime(fmt)
    const TAU = Math.PI * 2
    // Clockwise, so negate; 12 o'clock is up (rotation 0).
    if (second.current) second.current.rotation.z = -(s / 60) * TAU
    if (minute.current) minute.current.rotation.z = -((m + s / 60) / 60) * TAU
    if (hour.current) hour.current.rotation.z = -(((h % 12) + m / 60) / 12) * TAU
  })

  return (
    <group position={position} rotation={rotation}>
      {/* rim + dial, circular faces turned to point +z */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R + 0.05 * unit, R + 0.05 * unit, 0.06 * unit, 48]} />
        <meshStandardMaterial color={rim} metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.031 * unit]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[R, R, 0.02 * unit, 48]} />
        <meshStandardMaterial color={faceColor} roughness={0.5} />
      </mesh>

      {ticks.map(({ a, big, x, y }) => (
        <mesh key={a} position={[x, y, 0.045 * unit]} rotation={[0, 0, -a]}>
          <boxGeometry
            args={[(big ? 0.03 : 0.015) * unit, (big ? 0.1 : 0.06) * unit, 0.01 * unit]}
          />
          <meshStandardMaterial color={handColor} emissive={handColor} emissiveIntensity={0.2} />
        </mesh>
      ))}

      {/* hands: anchored at center, extending up; group rotation sweeps them */}
      <group ref={hour}>
        <mesh position={[0, R * 0.28, 0.05 * unit]}>
          <boxGeometry args={[0.035 * unit, R * 0.55, 0.012 * unit]} />
          <meshStandardMaterial color={handColor} emissive={handColor} emissiveIntensity={0.12} />
        </mesh>
      </group>
      <group ref={minute}>
        <mesh position={[0, R * 0.38, 0.055 * unit]}>
          <boxGeometry args={[0.022 * unit, R * 0.78, 0.012 * unit]} />
          <meshStandardMaterial color={handColor} emissive={handColor} emissiveIntensity={0.12} />
        </mesh>
      </group>
      <group ref={second}>
        <mesh position={[0, R * 0.42, 0.06 * unit]}>
          <boxGeometry args={[0.008 * unit, R * 0.86, 0.01 * unit]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={0.6}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* center hub */}
      <mesh position={[0, 0, 0.066 * unit]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03 * unit, 0.03 * unit, 0.03 * unit, 16]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.5}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
