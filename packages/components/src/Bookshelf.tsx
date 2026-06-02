import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { rng, useWorld, type Vec3 } from '@runek/core'
import { useMemo } from 'react'

export interface BookshelfProps {
  position?: Vec3
  rotation?: Vec3
  /** Outer dimensions in units. */
  width?: number
  height?: number
  depth?: number
  shelves?: number
  /** Fraction of shelf space filled with books, 0–1. */
  fill?: number
  seed?: number
}

interface Book {
  x: number
  y: number
  width: number
  height: number
  hue: number
}

const FRAME_COLOR = '#6b4f3a'
const BACK_COLOR = '#5c4330'

export function Bookshelf({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 1.2,
  height = 2,
  depth = 0.3,
  shelves = 4,
  fill = 0.7,
  seed = 1,
}: BookshelfProps) {
  const { unit } = useWorld()
  const w = width * unit
  const h = height * unit
  const d = depth * unit
  const plank = 0.03 * unit
  const inner = w - plank * 2
  const gap = (h - plank) / shelves

  const books = useMemo<Book[]>(() => {
    const next = rng(seed)
    const out: Book[] = []
    for (let shelf = 0; shelf < shelves; shelf++) {
      let x = -inner / 2
      while (x < inner / 2) {
        const bw = (0.025 + next() * 0.03) * unit
        if (x + bw > inner / 2) break
        const bh = gap * (0.55 + next() * 0.35)
        if (next() < fill) {
          out.push({
            x: x + bw / 2,
            y: -h / 2 + plank + gap * shelf + bh / 2,
            width: bw,
            height: bh,
            hue: next() * 360,
          })
        }
        x += bw + 0.004 * unit
      }
    }
    return out
  }, [h, inner, gap, plank, shelves, fill, seed, unit])

  const plankYs = Array.from({ length: shelves + 1 }, (_, i) => -h / 2 + plank / 2 + gap * i)

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      {/* one collider for the whole footprint — books stay visual-only */}
      <CuboidCollider args={[w / 2, h / 2, d / 2]} />

      <mesh castShadow receiveShadow position={[-w / 2 + plank / 2, 0, 0]}>
        <boxGeometry args={[plank, h, d]} />
        <meshStandardMaterial color={FRAME_COLOR} />
      </mesh>
      <mesh castShadow receiveShadow position={[w / 2 - plank / 2, 0, 0]}>
        <boxGeometry args={[plank, h, d]} />
        <meshStandardMaterial color={FRAME_COLOR} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0, -d / 2 + plank / 2]}>
        <boxGeometry args={[w, h, plank]} />
        <meshStandardMaterial color={BACK_COLOR} />
      </mesh>

      {plankYs.map((y) => (
        <mesh key={`plank-${y.toFixed(4)}`} castShadow receiveShadow position={[0, y, 0]}>
          <boxGeometry args={[inner, plank, d]} />
          <meshStandardMaterial color={FRAME_COLOR} />
        </mesh>
      ))}

      {books.map((book) => (
        <mesh
          key={`book-${book.x.toFixed(4)}-${book.y.toFixed(4)}`}
          castShadow
          position={[book.x, book.y, 0]}
        >
          <boxGeometry args={[book.width, book.height, d * 0.6]} />
          <meshStandardMaterial color={`hsl(${book.hue}, 45%, 55%)`} />
        </mesh>
      ))}
    </RigidBody>
  )
}
