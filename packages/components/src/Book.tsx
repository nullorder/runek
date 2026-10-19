import { Html } from '@react-three/drei'
import { type ThreeEvent, useFrame } from '@react-three/fiber'
import { DEFAULT_REACH, rng, useReach, useWorld, type Vec3 } from '@runek/core'
import { useMemo, useRef, useState } from 'react'
import type { Vector3 } from 'three'

export type BookPose = 'standing' | 'lying' | 'open'

export interface BookProps {
  position?: Vec3
  rotation?: Vec3
  /** Cover width (spine to fore-edge), in units. */
  width?: number
  /** Spine length, in units. */
  height?: number
  /** Closed page-block thickness, in units. */
  thickness?: number
  /**
   * `lying` rests on its back cover (spine on the -x edge); `standing` stands
   * upright on its bottom edge; `open` lies opened flat at the spine.
   */
  pose?: BookPose
  /** Cover color. Defaults to a seeded cloth-bound color. */
  color?: string
  pageColor?: string
  /** Shown as a hover label when the book is interactive. */
  title?: string
  /** Navigated to on click when no `onSelect` is given. */
  href?: string
  /** Called on click. Optional, so the book still renders from data. */
  onSelect?: () => void
  /** How close the player's avatar (its eyes) must be to hover or click the book, in units.
   *  Only applies while a `Player` is mounted; with a free camera it's always in reach. */
  reach?: number
  seed?: number
}

/**
 * A single procedural book — the standalone, placeable sibling of `Bookshelf`'s
 * instanced spines. Put it on a table, a pedestal, or a reading stand; give it
 * an `href` or `onSelect` and it becomes a clickable artifact. Decorative: no
 * collider.
 */
export function Book({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 0.22,
  height = 0.3,
  thickness = 0.05,
  pose = 'lying',
  color,
  pageColor = '#efe7d2',
  title,
  href,
  onSelect,
  reach = DEFAULT_REACH,
  seed = 1,
}: BookProps) {
  const { unit } = useWorld()
  const [hovered, setHovered] = useState(false)
  const inReach = useReach(reach)
  const lastHit = useRef<Vector3 | null>(null)

  const hover = (on: boolean) => {
    if (on !== hovered) setHovered(on)
    document.body.style.cursor = on ? 'pointer' : 'auto'
  }
  // Walking away with the pointer still on the book leaves no pointer event to clear it.
  useFrame(() => {
    if (hovered && lastHit.current && !inReach(lastHit.current)) hover(false)
  })

  const w = width * unit
  const h = height * unit
  const t = thickness * unit
  const board = Math.max(t * 0.16, 0.004 * unit)

  const coverColor = useMemo(() => {
    if (color) return color
    const next = rng(seed)
    return `hsl(${Math.round(next() * 360)}, ${Math.round(35 + next() * 20)}%, ${Math.round(
      35 + next() * 15,
    )}%)`
  }, [color, seed])

  const interactive = onSelect != null || href != null
  const handlers = interactive
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          if (!inReach(e.point)) return
          e.stopPropagation()
          if (onSelect) onSelect()
          else if (href) window.location.href = href
        },
        onPointerMove: (e: ThreeEvent<PointerEvent>) => {
          lastHit.current = e.point.clone()
          const near = inReach(e.point)
          if (near) e.stopPropagation()
          hover(near)
        },
        onPointerOut: () => hover(false),
      }
    : {}

  // The closed book in its lying frame: x = cover width, y = thickness,
  // z = spine length; resting on y = 0 with the spine along the -x edge.
  const closed = (
    <group>
      <mesh castShadow position={[0.01 * unit, t / 2, 0]}>
        <boxGeometry args={[w * 0.94, Math.max(t - board * 2, t * 0.5), h * 0.95]} />
        <meshStandardMaterial color={pageColor} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, board / 2, 0]}>
        <boxGeometry args={[w, board, h]} />
        <meshStandardMaterial color={coverColor} roughness={0.75} />
      </mesh>
      <mesh castShadow position={[0, t - board / 2, 0]}>
        <boxGeometry args={[w, board, h]} />
        <meshStandardMaterial color={coverColor} roughness={0.75} />
      </mesh>
      <mesh castShadow position={[-w / 2 + board / 2, t / 2, 0]}>
        <boxGeometry args={[board, t, h]} />
        <meshStandardMaterial color={coverColor} roughness={0.75} />
      </mesh>
    </group>
  )

  // One opened half: hinged at x = 0, extending toward +x; mirror with scaleX.
  const openTilt = 0.14
  const halfPages = Math.max((t - board * 2) / 2, t * 0.25)
  const openHalf = (side: 1 | -1) => (
    <group key={side} scale={[side, 1, 1]} rotation={[0, 0, -openTilt]}>
      <mesh castShadow position={[w / 2, board / 2, 0]}>
        <boxGeometry args={[w, board, h]} />
        <meshStandardMaterial color={coverColor} roughness={0.75} />
      </mesh>
      <mesh castShadow position={[(w / 2) * 0.98, board + halfPages / 2, 0]}>
        <boxGeometry args={[w * 0.92, halfPages, h * 0.94]} />
        <meshStandardMaterial color={pageColor} roughness={0.9} />
      </mesh>
    </group>
  )

  const body =
    pose === 'open' ? (
      <group>{[1 as const, -1 as const].map(openHalf)}</group>
    ) : pose === 'standing' ? (
      // Lift by half the spine length, then tip the lying frame upright.
      <group position={[0, h / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {closed}
      </group>
    ) : (
      closed
    )

  const labelY =
    pose === 'standing'
      ? h + 0.1 * unit
      : pose === 'open'
        ? board + halfPages + 0.1 * unit
        : t + 0.1 * unit

  return (
    <group position={position} rotation={rotation}>
      <group scale={hovered ? 1.08 : 1} {...handlers}>
        {body}
      </group>
      {hovered && title && (
        <Html position={[0, labelY, 0]} center distanceFactor={6} zIndexRange={[30, 0]}>
          <div
            style={{
              padding: '2px 8px',
              borderRadius: 6,
              background: 'rgba(10, 14, 20, 0.85)',
              color: '#f4efe6',
              font: '500 12px/1.4 system-ui, sans-serif',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {title}
          </div>
        </Html>
      )}
    </group>
  )
}
