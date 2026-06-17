import { Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { rng, useWorld, type Vec3 } from '@runek/core'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

/**
 * An addressable book on the shelf. JSON-serializable so a whole shelf of
 * clickable books survives a worlds-as-data round-trip; behavior (the reader,
 * the overlay) stays in the host via `onBookSelect`.
 */
export interface BookSpec {
  /** Stable identity, passed back to `onBookSelect`. */
  id: string
  /** Shown as a hover label. */
  title?: string
  /** Spine color. Defaults to a seeded color. */
  color?: string
  /** Navigated to on click when no `onBookSelect` is given. */
  href?: string
}

export interface BookshelfProps {
  position?: Vec3
  rotation?: Vec3
  /** Outer dimensions in units. */
  width?: number
  height?: number
  depth?: number
  shelves?: number
  /**
   * Fraction of shelf space filled with procedural decoration, 0–1. Defaults to
   * `0` (an empty shelf); set it for a decorative, non-interactive shelf. Ignored
   * when `books` is set.
   */
  fill?: number
  /** Frame color. Defaults to the world palette's `wood` slot. */
  color?: string
  /** Back-panel color. Defaults to the world palette's `woodDark` slot. */
  backColor?: string
  seed?: number
  /**
   * Explicit, addressable books. When provided, these replace the procedural
   * `fill` and are the only books rendered. Pass `[]` for an empty shelf and
   * append to make books appear. A book is clickable when `onBookSelect` is set
   * or it carries an `href`.
   */
  books?: BookSpec[]
  /** Called with the clicked book. When omitted, a book's `href` is navigated to. */
  onBookSelect?: (book: BookSpec) => void
}

interface Book {
  x: number
  y: number
  width: number
  height: number
  depth: number
  /** Spine tilt around z, radians — an occasional leaning book. */
  lean: number
  color: THREE.Color
  /** Set in configured mode: the book's identity and click behavior. */
  spec?: BookSpec
}

const HIGHLIGHT = new THREE.Color('#ffffff')

export function Bookshelf({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 1.2,
  height = 2,
  depth = 0.3,
  shelves = 4,
  fill = 0,
  color,
  backColor,
  seed = 1,
  books: bookSpecs,
  onBookSelect,
}: BookshelfProps) {
  const { unit, palette } = useWorld()
  const frameColor = color ?? palette.wood
  const panelColor = backColor ?? palette.woodDark
  const w = width * unit
  const h = height * unit
  const d = depth * unit
  const plank = 0.03 * unit
  const inner = w - plank * 2
  const gap = (h - plank) / shelves
  const booksRef = useRef<THREE.InstancedMesh>(null)
  const [hovered, setHovered] = useState<number | null>(null)

  const books = useMemo<Book[]>(() => {
    const next = rng(seed)
    const out: Book[] = []

    // Configured mode: render exactly the given books. Seeded geometry, but
    // identity/color come from the spec. Books pack into rows (bottom shelf
    // first) and each row is centered, so a partly-filled shelf still reads as
    // intentional rather than left-clustered.
    if (bookSpecs) {
      const sized = bookSpecs.map((spec) => {
        const bw = (0.075 + next() * 0.05) * unit
        const bh = gap * (0.6 + next() * 0.32)
        const hue = next() * 360
        const sat = 30 + next() * 25
        const light = 42 + next() * 20
        const bd = d * (0.55 + next() * 0.2)
        return {
          spec,
          bw,
          bh,
          bd,
          color: spec.color
            ? new THREE.Color(spec.color)
            : new THREE.Color(`hsl(${hue}, ${sat}%, ${light}%)`),
        }
      })

      const slack = 0.006 * unit
      const rows: (typeof sized)[] = [[]]
      let used = 0
      for (const book of sized) {
        const row = rows[rows.length - 1]
        if (row.length && used + slack + book.bw > inner) {
          if (rows.length >= shelves) break // out of shelf space
          rows.push([])
          used = 0
        }
        const current = rows[rows.length - 1]
        used += (current.length ? slack : 0) + book.bw
        current.push(book)
      }

      rows.forEach((row, shelf) => {
        const span = row.reduce((sum, b) => sum + b.bw, 0) + slack * Math.max(0, row.length - 1)
        let x = -span / 2
        for (const book of row) {
          out.push({
            x: x + book.bw / 2,
            y: -h / 2 + plank + gap * shelf + book.bh / 2,
            width: book.bw,
            height: book.bh,
            depth: book.bd,
            lean: 0, // upright: tidy, and a clean click target
            color: book.color,
            spec: book.spec,
          })
          x += book.bw + slack
        }
      })
      return out
    }

    // Procedural mode: seeded decorative fill (unchanged).
    for (let shelf = 0; shelf < shelves; shelf++) {
      let x = -inner / 2
      while (x < inner / 2) {
        const bw = (0.025 + next() * 0.03) * unit
        if (x + bw > inner / 2) break
        const bh = gap * (0.55 + next() * 0.35)
        const keep = next() < fill
        const lean = next() < 0.12 ? (next() - 0.5) * 0.22 : 0
        const hue = next() * 360
        const sat = 30 + next() * 25
        const light = 42 + next() * 20
        if (keep) {
          out.push({
            x: x + bw / 2,
            y: -h / 2 + plank + gap * shelf + bh / 2,
            width: bw,
            height: bh,
            depth: d * (0.5 + next() * 0.2),
            lean,
            color: new THREE.Color(`hsl(${hue}, ${sat}%, ${light}%)`),
          })
        }
        x += bw + 0.004 * unit
      }
    }
    return out
  }, [h, d, inner, gap, plank, shelves, fill, seed, unit, bookSpecs])

  useLayoutEffect(() => {
    const mesh = booksRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const tint = new THREE.Color()
    books.forEach((book, i) => {
      const hot = i === hovered
      const grow = hot ? 1.12 : 1
      dummy.position.set(book.x, book.y, hot ? book.depth * 0.5 : 0)
      dummy.rotation.set(0, 0, book.lean)
      dummy.scale.set(book.width * grow, book.height * grow, book.depth * (hot ? 1.5 : 1))
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, hot ? tint.copy(book.color).lerp(HIGHLIGHT, 0.3) : book.color)
    })
    mesh.count = books.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [books, hovered])

  const plankYs = Array.from({ length: shelves + 1 }, (_, i) => -h / 2 + plank / 2 + gap * i)

  // Interactive only when there's something a click can do. Decorative shelves
  // (no `books`) stay pure and event-free.
  const interactive = onBookSelect != null || books.some((b) => b.spec?.href != null)

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    const id = e.instanceId
    if (id == null) return
    const spec = books[id]?.spec
    if (!spec) return
    e.stopPropagation()
    if (onBookSelect) onBookSelect(spec)
    else if (spec.href) window.location.href = spec.href
  }

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    const spec = e.instanceId != null ? books[e.instanceId]?.spec : undefined
    if (!spec) {
      if (hovered != null) {
        setHovered(null)
        document.body.style.cursor = 'auto'
      }
      return
    }
    e.stopPropagation()
    if (e.instanceId !== hovered) setHovered(e.instanceId ?? null)
    document.body.style.cursor = 'pointer'
  }

  const handleOut = () => {
    setHovered(null)
    document.body.style.cursor = 'auto'
  }

  const hoveredBook = hovered != null ? books[hovered] : undefined

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      {/* one collider for the whole footprint — books stay visual-only */}
      <CuboidCollider args={[w / 2, h / 2, d / 2]} />

      <mesh castShadow receiveShadow position={[-w / 2 + plank / 2, 0, 0]}>
        <boxGeometry args={[plank, h, d]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      <mesh castShadow receiveShadow position={[w / 2 - plank / 2, 0, 0]}>
        <boxGeometry args={[plank, h, d]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0, -d / 2 + plank / 2]}>
        <boxGeometry args={[w, h, plank]} />
        <meshStandardMaterial color={panelColor} />
      </mesh>

      {plankYs.map((y) => (
        <mesh key={`plank-${y.toFixed(4)}`} castShadow receiveShadow position={[0, y, 0]}>
          <boxGeometry args={[inner, plank, d]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
      ))}

      {/* all books in one draw call */}
      {books.length > 0 && (
        <instancedMesh
          key={books.length}
          ref={booksRef}
          args={[undefined, undefined, books.length]}
          castShadow
          onClick={interactive ? handleClick : undefined}
          onPointerMove={interactive ? handleMove : undefined}
          onPointerOut={interactive ? handleOut : undefined}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial roughness={0.85} />
        </instancedMesh>
      )}

      {hoveredBook?.spec?.title && (
        <Html
          position={[
            hoveredBook.x,
            hoveredBook.y + hoveredBook.height / 2 + 0.12 * unit,
            hoveredBook.depth,
          ]}
          center
          distanceFactor={6}
          zIndexRange={[30, 0]}
        >
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
            {hoveredBook.spec.title}
          </div>
        </Html>
      )}
    </RigidBody>
  )
}
