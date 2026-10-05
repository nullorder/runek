import { Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useWorld, type Vec3 } from '@runek/core'
import { useMemo, useRef, useState } from 'react'
import { type Group, type Mesh, Shape, ShapeGeometry } from 'three'
import { Sign } from '../Sign'
import type { PersonEmote } from './types'

const PAPER = '#fbf8f1'
const INK = '#2b2a2e'
const MAX_CHARS = 90
const ALERT = '#e0573f'
const THINK = '#56607a'

/** A rounded box with a little tail at the bottom middle, its origin at the tail's tip. */
function bubbleShape(w: number, h: number, r: number, tail: number) {
  const s = new Shape()
  const x0 = -w / 2
  const y0 = tail
  s.moveTo(0, 0)
  s.lineTo(-tail * 0.8, y0)
  s.lineTo(x0 + r, y0)
  s.quadraticCurveTo(x0, y0, x0, y0 + r)
  s.lineTo(x0, y0 + h - r)
  s.quadraticCurveTo(x0, y0 + h, x0 + r, y0 + h)
  s.lineTo(-x0 - r, y0 + h)
  s.quadraticCurveTo(-x0, y0 + h, -x0, y0 + h - r)
  s.lineTo(-x0, y0 + r)
  s.quadraticCurveTo(-x0, y0, -x0 - r, y0)
  s.lineTo(tail * 0.8, y0)
  s.closePath()
  return new ShapeGeometry(s, 6)
}

export interface SpeechBubbleProps {
  text: string
  /** Where the tail points to, the bubble rising above it. */
  position?: Vec3
  /** Cap height of the text, in units. */
  size?: number
  /** Wrap width, in units. */
  maxWidth?: number
  /** Reports the bubble's height so things can stack above it. */
  onHeight?: (height: number) => void
}

/** A short line of speech in a rounded bubble, always facing the camera. Long text wraps, and
 *  past a few lines it's cut with an ellipsis: a bubble is a glance, not a page. */
export function SpeechBubble({
  text,
  position,
  size = 0.075,
  maxWidth = 1.5,
  onHeight,
}: SpeechBubbleProps) {
  const { unit } = useWorld()
  const [box, setBox] = useState<[number, number] | null>(null)
  const line = text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS - 1)}…` : text
  const pad = size * unit * 0.9
  const tail = size * unit * 0.9
  const w = (box?.[0] ?? 0) + pad * 2
  const h = (box?.[1] ?? 0) + pad * 1.4
  const geo = useMemo(
    () => (box ? bubbleShape(w, h, Math.min(h / 2, pad * 1.4), tail) : null),
    [box, w, h, pad, tail],
  )
  return (
    <Billboard position={position}>
      {geo && (
        <mesh geometry={geo} renderOrder={1}>
          <meshBasicMaterial color={PAPER} toneMapped={false} />
        </mesh>
      )}
      <Sign
        position={[0, tail + h / 2, 0.002 * unit]}
        variant="body"
        size={size}
        color={INK}
        maxWidth={maxWidth}
        onBounds={(bw, bh) => {
          setBox((prev) => (prev && prev[0] === bw && prev[1] === bh ? prev : [bw, bh]))
          onHeight?.(bh + pad * 1.4 + tail)
        }}
      >
        {line}
      </Sign>
    </Billboard>
  )
}

function heartGeometry(s: number) {
  const shape = new Shape()
  shape.moveTo(0, -s * 0.9)
  shape.bezierCurveTo(-s * 0.2, -s * 0.6, -s * 1.1, -s * 0.2, -s * 1.0, s * 0.35)
  shape.bezierCurveTo(-s * 0.9, s * 0.95, -s * 0.15, s * 1.0, 0, s * 0.45)
  shape.bezierCurveTo(s * 0.15, s * 1.0, s * 0.9, s * 0.95, s * 1.0, s * 0.35)
  shape.bezierCurveTo(s * 1.1, -s * 0.2, s * 0.2, -s * 0.6, 0, -s * 0.9)
  return new ShapeGeometry(shape, 8)
}

export interface EmoteProps {
  kind: PersonEmote
  position?: Vec3
  /** Overall size, in units. */
  size?: number
}

/**
 * A small animated sign of a state, drawn from primitives and the world font (no icons):
 * `sleep` rising z's, `alert` a bouncing !, `think` three pulsing dots, `happy` a beating heart,
 * `coffee` a steaming cup.
 */
export function Emote({ kind, position, size = 0.17 }: EmoteProps) {
  const { unit, palette } = useWorld()
  const s = size * unit
  const parts = useRef<(Group | Mesh | null)[]>([])
  const heart = useMemo(() => (kind === 'happy' ? heartGeometry(s * 0.5) : null), [kind, s])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const ps = parts.current
    if (kind === 'sleep') {
      ps.forEach((g, i) => {
        if (!g) return
        const k = (t * 0.45 + i / 3) % 1
        g.position.set(Math.sin(k * 5 + i) * s * 0.1 + k * s * 1.3, k * s * 2.4, 0)
        g.scale.setScalar(0.5 + k * 0.7)
        g.visible = k < 0.92
      })
    } else if (kind === 'alert') {
      const g = ps[0]
      if (g) g.position.y = Math.abs(Math.sin(t * 5)) * s * 0.35
    } else if (kind === 'think') {
      ps.forEach((g, i) => {
        g?.scale.setScalar(0.7 + 0.45 * Math.max(0, Math.sin(t * 4 - i * 0.9)))
      })
    } else if (kind === 'happy') {
      const b = 1 + 0.12 * Math.max(0, Math.sin(t * 7)) * Math.max(0, Math.sin(t * 3.5))
      ps[0]?.scale.setScalar(b)
    } else if (kind === 'coffee') {
      ps.forEach((g, i) => {
        if (!g || i === 0) return
        const k = (t * 0.5 + i / 3) % 1
        g.position.set(Math.sin(k * 6 + i * 2) * s * 0.08, s * 0.35 + k * s * 0.9, 0)
        g.scale.setScalar((1 - k) * 0.9 + 0.1)
      })
    }
  })

  const set = (i: number) => (o: Group | Mesh | null) => {
    parts.current[i] = o
  }

  return (
    <Billboard position={position}>
      {kind === 'sleep' &&
        [0, 1, 2].map((i) => (
          <group key={i} ref={set(i)}>
            <Sign variant="display" size={size} color="#9cc1f2" outline="#1d2a44">
              z
            </Sign>
          </group>
        ))}
      {kind === 'alert' && (
        <group ref={set(0)}>
          <Sign variant="display" size={size * 1.6} color={ALERT} outline="#3a1610">
            !
          </Sign>
        </group>
      )}
      {kind === 'think' &&
        [-1, 0, 1].map((x, i) => (
          <mesh key={x} ref={set(i)} position={[x * s * 0.42, 0, 0]}>
            <sphereGeometry args={[s * 0.13, 12, 8]} />
            <meshBasicMaterial color={THINK} toneMapped={false} />
          </mesh>
        ))}
      {kind === 'happy' && heart && (
        <mesh ref={set(0)} geometry={heart}>
          <meshBasicMaterial color="#e2566f" toneMapped={false} />
        </mesh>
      )}
      {kind === 'coffee' && (
        <>
          <group ref={set(0)}>
            <mesh position={[0, s * 0.12, 0]}>
              <cylinderGeometry args={[s * 0.24, s * 0.2, s * 0.32, 16]} />
              <meshBasicMaterial color={PAPER} toneMapped={false} />
            </mesh>
            <mesh position={[s * 0.27, s * 0.13, 0]}>
              <torusGeometry args={[s * 0.09, s * 0.03, 6, 12]} />
              <meshBasicMaterial color={PAPER} toneMapped={false} />
            </mesh>
            <mesh position={[0, s * 0.27, 0.001 * unit]}>
              <planeGeometry args={[s * 0.44, s * 0.05]} />
              <meshBasicMaterial color={palette.woodDark} toneMapped={false} />
            </mesh>
          </group>
          {[1, 2, 3].map((i) => (
            <mesh key={i} ref={set(i)}>
              <sphereGeometry args={[s * 0.07, 8, 6]} />
              <meshBasicMaterial color="#e9eef2" transparent opacity={0.75} toneMapped={false} />
            </mesh>
          ))}
        </>
      )}
    </Billboard>
  )
}
