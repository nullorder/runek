import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { rng, useWorld, type Vec3 } from '@runek/core'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

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
  /** Frame color. Defaults to the world palette's `wood` slot. */
  color?: string
  /** Back-panel color. Defaults to the world palette's `woodDark` slot. */
  backColor?: string
  seed?: number
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
}

export function Bookshelf({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 1.2,
  height = 2,
  depth = 0.3,
  shelves = 4,
  fill = 0.7,
  color,
  backColor,
  seed = 1,
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

  const books = useMemo<Book[]>(() => {
    const next = rng(seed)
    const out: Book[] = []
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
  }, [h, d, inner, gap, plank, shelves, fill, seed, unit])

  useLayoutEffect(() => {
    const mesh = booksRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    books.forEach((book, i) => {
      dummy.position.set(book.x, book.y, 0)
      dummy.rotation.set(0, 0, book.lean)
      dummy.scale.set(book.width, book.height, book.depth)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, book.color)
    })
    mesh.count = books.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [books])

  const plankYs = Array.from({ length: shelves + 1 }, (_, i) => -h / 2 + plank / 2 + gap * i)

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
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial roughness={0.85} />
        </instancedMesh>
      )}
    </RigidBody>
  )
}
