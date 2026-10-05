import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { pick, range, rng, sub, useWorld, type Vec3, type WorldComponentProps } from '@runek/core'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, type InstancedMesh, Object3D } from 'three'
import { Sign } from './Sign'

/** On a rolling `stand`, or flat on a `wall` (origin at the board's middle, back to local -Z). */
export type WhiteboardMount = 'stand' | 'wall'

export interface WhiteboardProps extends WorldComponentProps {
  /** Board width, in units. */
  width?: number
  /** Board height, in units. */
  height?: number
  mount?: WhiteboardMount
  /** Written across the top of the board in marker. */
  text?: string
  /** Seeded marker diagrams (boxes, arrows, lines). Set false for a clean board. */
  doodles?: boolean
  /** Frame and stand; defaults to the palette's `metal`. */
  color?: string
}

interface Stroke {
  pos: Vec3
  size: [number, number]
  angle: number
  color: string
}

const MARKERS = ['#2f5fb3', '#c0392b', '#2e8b57', '#2b2a2e']
const BOARD = '#f7f7f4'

/**
 * A whiteboard on a rolling stand or a wall, with a seeded scrawl of diagrams on it (boxes joined
 * by arrows, underlined lines of "writing"), all thin geometry, and optional `text` in the world's
 * font across the top. One cuboid collider.
 */
export function Whiteboard({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  width = 1.6,
  height = 1,
  mount = 'stand',
  text,
  doodles = true,
  color,
}: WhiteboardProps) {
  const { unit, palette } = useWorld()
  const frame = color ?? palette.metal
  const W = width * unit
  const H = height * unit
  const t = 0.02 * unit
  const wall = mount === 'wall'
  const cy = wall ? 0 : 0.75 * unit + H / 2
  const cz = wall ? t / 2 + 0.01 * unit : 0

  const strokes = useMemo<Stroke[]>(() => {
    if (!doodles) return []
    const r = rng(sub(seed, 0))
    const out: Stroke[] = []
    const line = 0.006 * unit
    const add = (x0: number, y0: number, x1: number, y1: number, c: string) =>
      out.push({
        pos: [(x0 + x1) / 2, (y0 + y1) / 2, 0],
        size: [Math.hypot(x1 - x0, y1 - y0), line],
        angle: Math.atan2(y1 - y0, x1 - x0),
        color: c,
      })
    const box = (x: number, y: number, w: number, h: number, c: string) => {
      add(x - w / 2, y - h / 2, x + w / 2, y - h / 2, c)
      add(x - w / 2, y + h / 2, x + w / 2, y + h / 2, c)
      add(x - w / 2, y - h / 2, x - w / 2, y + h / 2, c)
      add(x + w / 2, y - h / 2, x + w / 2, y + h / 2, c)
    }
    const top = text ? 0.2 : 0.35
    // A row of boxes joined by arrows.
    const n = 2 + Math.floor(r() * 2)
    const bw = (0.7 / n) * W * 0.6
    const bh = 0.16 * H
    const by = range(r, -0.05, top - 0.15) * H
    const ink = pick(r, MARKERS)
    for (let i = 0; i < n; i++) {
      const x = (-0.35 + (0.7 * (i + 0.5)) / n) * W
      box(x, by, bw, bh, ink)
      if (i < n - 1) {
        const x0 = x + bw / 2 + 0.01 * W
        const x1 = x + (0.7 / n) * W - bw / 2 - 0.01 * W
        add(x0, by, x1, by, ink)
        add(x1 - 0.02 * W, by + 0.02 * H, x1, by, ink)
        add(x1 - 0.02 * W, by - 0.02 * H, x1, by, ink)
      }
    }
    // Lines of "writing" below, one underlined.
    const lines = 2 + Math.floor(r() * 3)
    const second = pick(r, MARKERS)
    for (let i = 0; i < lines; i++) {
      const y = (-0.22 - i * 0.07) * H
      const w = range(r, 0.25, 0.6) * W
      const x0 = -0.4 * W
      // Words: short dashes along the line.
      let x = x0
      while (x < x0 + w) {
        const word = range(r, 0.03, 0.08) * W
        add(x, y, Math.min(x + word, x0 + w), y + range(r, -0.004, 0.004) * H, second)
        x += word + 0.015 * W
      }
      if (i === 0) add(x0, y - 0.025 * H, x0 + w * 0.5, y - 0.025 * H, second)
    }
    return out
  }, [doodles, seed, W, H, unit, text])

  // Every stroke is one instance of a unit square, scaled and turned into place.
  const ink = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ink.current
    if (!mesh) return
    const o = new Object3D()
    const c = new Color()
    strokes.forEach((st, i) => {
      o.position.set(st.pos[0], st.pos[1], 0.0005 * unit)
      o.rotation.set(0, 0, st.angle)
      o.scale.set(st.size[0], st.size[1], 1)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      mesh.setColorAt(i, c.set(st.color))
    })
    mesh.count = strokes.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [strokes, unit])

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      {wall ? (
        <CuboidCollider args={[W / 2, H / 2, t / 2]} position={[0, 0, cz]} />
      ) : (
        <CuboidCollider
          args={[W / 2 + 0.05 * unit, (cy + H / 2) / 2, 0.25 * unit]}
          position={[0, (cy + H / 2) / 2, 0]}
        />
      )}
      <mesh position={[0, cy, cz]} castShadow>
        <boxGeometry args={[W + 0.04 * unit, H + 0.04 * unit, t]} />
        <meshStandardMaterial color={frame} roughness={0.4} metalness={0.4} />
      </mesh>
      <group position={[0, cy, cz + t / 2 + 0.0008 * unit]}>
        <mesh receiveShadow>
          <planeGeometry args={[W, H]} />
          <meshStandardMaterial color={BOARD} roughness={0.25} />
        </mesh>
        {strokes.length > 0 && (
          <instancedMesh
            key={strokes.length}
            ref={ink}
            args={[undefined, undefined, strokes.length]}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial />
          </instancedMesh>
        )}
        {text && (
          <Sign
            position={[0, H * 0.36, 0.001 * unit]}
            variant="body"
            size={Math.min(0.09, height * 0.09)}
            color="#2b2a2e"
            maxWidth={width * 0.9}
          >
            {text}
          </Sign>
        )}
        {/* marker tray */}
        <mesh position={[0, -H / 2 - 0.03 * unit, 0.02 * unit]} castShadow>
          <boxGeometry args={[W * 0.5, 0.015 * unit, 0.05 * unit]} />
          <meshStandardMaterial color={frame} roughness={0.4} metalness={0.4} />
        </mesh>
      </group>
      {!wall &&
        [-1, 1].map((s) => (
          <group key={s} position={[s * (W / 2 + 0.03 * unit), 0, 0]}>
            <mesh position={[0, (cy + H / 2) / 2, 0]} castShadow>
              <boxGeometry args={[0.03 * unit, cy + H / 2, 0.03 * unit]} />
              <meshStandardMaterial color={frame} roughness={0.4} metalness={0.4} />
            </mesh>
            <mesh position={[0, 0.05 * unit, 0]} castShadow>
              <boxGeometry args={[0.04 * unit, 0.03 * unit, 0.5 * unit]} />
              <meshStandardMaterial color={frame} roughness={0.4} metalness={0.4} />
            </mesh>
            {[-1, 1].map((z) => (
              <mesh key={z} position={[0, 0.025 * unit, z * 0.23 * unit]}>
                <sphereGeometry args={[0.025 * unit, 8, 6]} />
                <meshStandardMaterial color="#1c1c1e" roughness={0.6} />
              </mesh>
            ))}
          </group>
        ))}
    </RigidBody>
  )
}
