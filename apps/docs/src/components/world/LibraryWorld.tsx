import { Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { Bookshelf, Lamp, LightRig, Player, Room, Rug, Sky } from '@runek/components'
import { World, type WorldPalette } from '@runek/core'
import { useEffect, useState } from 'react'

export type DocMeta = {
  slug: string
  title: string
  summary: string
  category: string
  /** Pre-rendered HTML of the doc body (built with `marked` in library.astro). */
  body?: string
}

const CATEGORY_COLOR: Record<string, string> = {
  intro: '#7c9cff',
  guide: '#5fd0a8',
  component: '#e0a96d',
  reference: '#c08cf0',
}

const SPREAD = 0.9

/** Warm reading-room theme — one palette re-colors every component in the world. */
const LIBRARY_PALETTE: Partial<WorldPalette> = {
  wood: '#7a5a40',
  woodDark: '#64482f',
  wall: '#b9b2a4',
  fabric: '#6e3d44',
  accent: '#c2a05a',
}

// Runek's mark: Raidho (ᚱ), built as 3D geometry so it stays crisp and asset-free.
// Stroke endpoints in a centered, y-up space; x is mirrored from logo.svg so the
// rune reads correctly to a player looking toward +z (the far wall).
const RUNE_POINTS = {
  A: [4, 9], // top of the stave
  B: [4, -9], // foot of the stave
  C: [-4, 4.5], // bowl's outer point
  D: [4, 0], // bowl meets the stave
  E: [-4, -9], // foot of the leg
} as const
const RUNE_SEGMENTS: [keyof typeof RUNE_POINTS, keyof typeof RUNE_POINTS][] = [
  ['A', 'B'],
  ['A', 'C'],
  ['C', 'D'],
  ['D', 'E'],
]
const RUNE_SCALE = 0.095
const RUNE_STROKE = 0.13
const RUNE_DEPTH = 0.1
const RUNE_GREEN = '#3df58a'

function RuneStroke({ a, b }: { a: readonly [number, number]; b: readonly [number, number] }) {
  const ax = a[0] * RUNE_SCALE
  const ay = a[1] * RUNE_SCALE
  const bx = b[0] * RUNE_SCALE
  const by = b[1] * RUNE_SCALE
  const dx = bx - ax
  const dy = by - ay
  const len = Math.hypot(dx, dy) + RUNE_STROKE // overshoot so joints overlap cleanly
  return (
    <mesh position={[(ax + bx) / 2, (ay + by) / 2, 0]} rotation={[0, 0, Math.atan2(dy, dx)]}>
      <boxGeometry args={[len, RUNE_STROKE, RUNE_DEPTH]} />
      <meshStandardMaterial
        color={RUNE_GREEN}
        emissive={RUNE_GREEN}
        emissiveIntensity={0.9}
        toneMapped={false}
      />
    </mesh>
  )
}

/**
 * A framed, glowing Runek emblem for the library wall. Mounts at the wall and
 * stacks toward the player (−z): frame against the wall, rune frontmost.
 */
function RunekEmblem({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.55, 2.3, 0.08]} />
        <meshStandardMaterial color="#4a3726" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[1.3, 2.05, 0.04]} />
        <meshStandardMaterial color="#0a0e14" roughness={0.6} />
      </mesh>
      <group position={[0, 0, -0.08]}>
        {RUNE_SEGMENTS.map(([p, q]) => (
          <RuneStroke key={`${p}${q}`} a={RUNE_POINTS[p]} b={RUNE_POINTS[q]} />
        ))}
      </group>
      <pointLight position={[0, 0, -0.7]} color={RUNE_GREEN} intensity={3} distance={4} decay={2} />
    </group>
  )
}

export default function LibraryWorld({ docs }: { docs: DocMeta[] }) {
  const [selected, setSelected] = useState<DocMeta | null>(null)

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <World lights={false} palette={LIBRARY_PALETTE} onPointerMissed={() => setSelected(null)}>
        <Sky />
        <LightRig sunPosition={[4, 16, -8]} ambient={0.6} />
        <Room size={[14, 14]} height={4.5} doorWidth={0} />

        {/* The Runek mark on the far wall, above the shelves — the room's focal point. */}
        <RunekEmblem position={[0, 3.2, 6.78]} />

        {/* Atmosphere: decorative shelves lining the far wall, facing the visitor. */}
        <Bookshelf position={[-5, 1, 6.5]} rotation={[0, Math.PI, 0]} seed={3} />
        <Bookshelf position={[-3.4, 1, 6.5]} rotation={[0, Math.PI, 0]} seed={7} />
        <Bookshelf position={[3.4, 1, 6.5]} rotation={[0, Math.PI, 0]} seed={11} />
        <Bookshelf position={[5, 1, 6.5]} rotation={[0, Math.PI, 0]} seed={17} />

        {/* Reading-room warmth: flickering lamps flanking the shelves, a rug at the cabinet. */}
        <Lamp position={[-6.2, 0, 6.2]} />
        <Lamp position={[6.2, 0, 6.2]} />
        <Rug position={[0, 0.01, 0.4]} size={[7, 3.4]} seed={5} />

        {/* The doc cabinet + interactive books, one per Markdown doc. */}
        <mesh position={[0, 0.5, 2.2]} castShadow receiveShadow>
          <boxGeometry args={[docs.length * SPREAD + 0.9, 1, 0.7]} />
          <meshStandardMaterial color="#4a3726" />
        </mesh>
        {docs.map((doc, i) => (
          <DocBook
            key={doc.slug}
            doc={doc}
            position={[(i - (docs.length - 1) / 2) * SPREAD, 1.25, 2.0]}
            onOpen={setSelected}
          />
        ))}

        <Player position={[0, 2, -3.5]} yaw={0} />
      </World>

      <div className="world-hud">
        <span>
          <b>WASD</b> move
        </span>
        <span>
          <b>drag</b> look
        </span>
        <span>
          <b>click</b> a book
        </span>
        <a href="/docs">2D docs →</a>
      </div>

      {selected && <DocReader doc={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function DocReader({ doc, onClose }: { doc: DocMeta; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="doc-overlay" role="dialog" aria-modal="true" aria-label={doc.title}>
      <div className="doc-reader">
        <div className="row">
          <span className="eyebrow">{doc.category}</span>
          <button type="button" className="close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <h2>{doc.title}</h2>
        {doc.body ? (
          // Trusted, build-rendered doc HTML (from our own Markdown).
          <div className="doc-reader-body" dangerouslySetInnerHTML={{ __html: doc.body }} />
        ) : (
          <p className="doc-reader-body">{doc.summary}</p>
        )}
        <a className="btn primary" href={`/docs/${doc.slug}`}>
          Open full page →
        </a>
      </div>
    </div>
  )
}

function DocBook({
  doc,
  position,
  onOpen,
}: {
  doc: DocMeta
  position: [number, number, number]
  onOpen: (doc: DocMeta) => void
}) {
  const [hover, setHover] = useState(false)
  const color = CATEGORY_COLOR[doc.category] ?? '#e0a96d'

  return (
    <group position={position}>
      <mesh
        castShadow
        scale={hover ? [1.1, 1.08, 1.4] : [1, 1, 1]}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          onOpen(doc)
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          setHover(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHover(false)
          document.body.style.cursor = 'auto'
        }}
      >
        <boxGeometry args={[0.6, 0.46, 0.14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hover ? 0.45 : 0} />
      </mesh>
      {hover && (
        <Html position={[0, 0.42, 0]} center distanceFactor={6} zIndexRange={[30, 0]}>
          <div className="book-label">{doc.title}</div>
        </Html>
      )}
    </group>
  )
}
