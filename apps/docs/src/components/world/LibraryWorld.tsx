import {
  type BookSpec,
  Bookshelf,
  Clock,
  Floor,
  Lamp,
  LightRig,
  Player,
  Rug,
  Sign,
  Sky,
  Wall,
} from '@runek/components'
import { World, type WorldPalette } from '@runek/core'
import { useEffect, useMemo, useState } from 'react'
import GalleryWing from './GalleryWing'

export type DocMeta = {
  slug: string
  title: string
  summary: string
  category: string
  /** Registry name (lowercase) of the component this doc describes. */
  component?: string
  /** Pre-rendered HTML of the doc body (built with `marked` in library.astro). */
  body?: string
}

const CATEGORY_COLOR: Record<string, string> = {
  intro: '#7c9cff',
  guide: '#5fd0a8',
  component: '#e0a96d',
  reference: '#c08cf0',
}

/** Warm reading-room theme — one palette re-colors every component in the world. */
const LIBRARY_PALETTE: Partial<WorldPalette> = {
  wood: '#7a5a40',
  woodDark: '#64482f',
  wall: '#b9b2a4',
  fabric: '#6e3d44',
  accent: '#c2a05a',
}

/** The four doc shelves on the far wall. Each shelf holds one labeled category
 * section (guides span two shelves: `slot` n `of` m), so a new doc only ever
 * joins its own section instead of reshuffling every shelf. */
const WALL_SHELVES = [
  { x: -5, seed: 3, label: 'Intro', category: 'intro', slot: 0, of: 1 },
  { x: -3.4, seed: 7, label: 'Guides', category: 'guide', slot: 0, of: 2 },
  { x: 3.4, seed: 11, label: 'Guides', category: 'guide', slot: 1, of: 2 },
  { x: 5, seed: 17, label: 'Reference', category: 'reference', slot: 0, of: 1 },
]

/** Rows per wall case (the Bookshelf default); books spread across them. */
const SHELF_ROWS = 3

/** Runek's display face, served from the docs public dir. The world declares it
 * as its `display` font, and every `Sign` draws from there. troika needs ttf/otf
 * (not the woff2 the CSS @font-face uses), so we ship the ttf alongside. */
const PIXEL_FONT = '/fonts/Pixelspace-Regular.ttf'

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

/** "RUNEK" painted on a wall, in the brand's Pixelspace face. */
function WallWord({
  position,
  rotation,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
}) {
  // `glow` gives the letters a blurred green halo, a subtle glow without bloom.
  return (
    <Sign
      position={position}
      rotation={rotation}
      size={1.2}
      letterSpacing={0.08}
      color={RUNE_GREEN}
      glow
    >
      RUNEK
    </Sign>
  )
}

/** The zone the clock is showing, as `UTC±HH:MM`. Local offset when available,
 * otherwise the IST fallback the time uses. */
function clockZoneLabel(): string {
  try {
    const off = -new Date().getTimezoneOffset() // minutes east of UTC
    if (!Number.isFinite(off)) throw new Error('no local zone')
    const a = Math.abs(off)
    const hh = String(Math.floor(a / 60)).padStart(2, '0')
    const mm = String(a % 60).padStart(2, '0')
    return `UTC${off >= 0 ? '+' : '-'}${hh}:${mm}`
  } catch {
    return 'UTC+05:30'
  }
}

export default function LibraryWorld({
  docs,
  componentDocs = [],
  version,
}: {
  docs: DocMeta[]
  /** One doc per registry component — the gallery wing's guide books. */
  componentDocs?: DocMeta[]
  /** Current Runek version, painted under the wall mark (e.g. "0.13.0"). */
  version?: string
}) {
  const [selected, setSelected] = useState<DocMeta | null>(null)

  // One clickable spine per doc; ids are slugs so a select maps back to its doc.
  // Books are grouped per shelf by the shelf's category section, in reading
  // order, and spread across the case's rows top-to-bottom (e.g. on Reference,
  // the CLI reference sits on the top row and the changelog on the bottom).
  const shelfBooks = useMemo<BookSpec[][]>(
    () =>
      WALL_SHELVES.map(({ category, slot, of }) => {
        const section = docs.filter((doc) => doc.category === category)
        const size = Math.ceil(section.length / of)
        const chunk = section.slice(slot * size, (slot + 1) * size)
        return chunk.map((doc, i) => ({
          id: doc.slug,
          title: doc.title,
          color: CATEGORY_COLOR[doc.category],
          shelf: Math.round((i * (SHELF_ROWS - 1)) / Math.max(1, chunk.length - 1)),
        }))
      }),
    [docs],
  )
  const zone = useMemo(clockZoneLabel, [])
  const openDoc = (book: BookSpec) => {
    const doc = docs.find((d) => d.slug === book.id)
    if (doc) setSelected(doc)
  }

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <World
        lights={false}
        palette={LIBRARY_PALETTE}
        fonts={{ display: PIXEL_FONT }}
        time="21:30"
        onPointerMissed={() => setSelected(null)}
      >
        {/* Night over the open-topped room: Sky reads the world's late hour and
            renders the dark dome + starfield itself. */}
        <Sky />
        <LightRig sunPosition={[4, 16, -8]} sunColor="#fff4e0" sunIntensity={1.7} ambient={0.6} />

        {/* The reading room, composed from Walls (not Room) so the right (-x)
            wall can take a doorway into the gallery wing. Same 14×14 footprint,
            walls at ±6.9 with 0.2 thickness, open to the night sky. */}
        <Floor size={[14, 14]} color={LIBRARY_PALETTE.wall} />
        <Wall position={[0, 0, -6.9]} width={14} height={4.5} />
        <Wall position={[0, 0, 6.9]} width={14} height={4.5} />
        <Wall position={[6.9, 0, 0]} rotation={[0, Math.PI / 2, 0]} width={14} height={4.5} />
        <Wall
          position={[-6.9, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
          width={14}
          height={4.5}
          openings={[{ width: 2.4, height: 3 }]}
        />

        {/* "RUNEK" painted on the left (+x) wall; the right wall hosts the
            gallery doorway instead, with a lintel sign facing the room. */}
        <WallWord position={[6.78, 2.7, 0]} rotation={[0, -Math.PI / 2, 0]} />
        {/* the current version, painted small beneath the mark */}
        {version && (
          <Sign
            position={[6.78, 1.45, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            size={0.16}
            letterSpacing={0.06}
            color={RUNE_GREEN}
          >
            {`v${version}`}
          </Sign>
        )}
        <Sign
          position={[-6.78, 3.35, 0]}
          rotation={[0, Math.PI / 2, 0]}
          size={0.14}
          letterSpacing={0.02}
          color="#e3cd96"
        >
          Component Gallery
        </Sign>

        {/* The gallery wing beyond the doorway: every component on display,
            each with its integration guide. Selecting a guide opens the same
            reader the shelf books use. */}
        <GalleryWing componentDocs={componentDocs} onSelect={setSelected} />

        {/* The Runek mark on the far wall, above the shelves — the room's focal point. */}
        <RunekEmblem position={[0, 3.2, 6.78]} />

        {/* Nameplate beneath the mark, facing the room (−z, toward the player). */}
        <group position={[0, 1.7, 6.72]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[3.7, 0.46, 0.07]} />
            <meshStandardMaterial color="#3a2c1d" roughness={0.6} metalness={0.2} />
          </mesh>
          <Sign
            position={[0, 0, -0.05]}
            rotation={[0, Math.PI, 0]}
            size={0.14}
            letterSpacing={0.015}
            color="#e3cd96"
          >
            Welcome to Runek Library
          </Sign>
        </group>

        {/* Analog clock on the back wall (−z), behind the visitor's spawn. The
            timezone label rides on the dial as a Sign; the world declares no
            `body` font, so it falls back to the default bundled in core. */}
        <Clock position={[0, 2.7, -6.78]} frameColor="#2c2118" accentColor={RUNE_GREEN} />
        <Sign
          variant="body"
          position={[0, 2.447, -6.73]}
          size={0.07}
          letterSpacing={0.01}
          color="#9fb4c8"
        >
          {zone}
        </Sign>
        <pointLight
          position={[0, 2.7, -5.9]}
          intensity={4}
          distance={4.5}
          decay={2}
          color="#cfe0ff"
        />

        {/* The doc shelves lining the far wall: every book is a clickable doc,
            grouped into labeled category sections. */}
        {WALL_SHELVES.map(({ x, seed, label, category }, i) => (
          <Bookshelf
            key={x}
            position={[x, 0.9, 6.5]}
            rotation={[0, Math.PI, 0]}
            width={1.1}
            height={1.8}
            shelves={SHELF_ROWS}
            seed={seed}
            label={label}
            labelColor={CATEGORY_COLOR[category]}
            books={shelfBooks[i]}
            onBookSelect={openDoc}
          />
        ))}

        {/* Reading-room warmth: flickering lamps flanking the shelves, a central rug. */}
        <Lamp position={[-6.2, 0, 6.2]} />
        <Lamp position={[6.2, 0, 6.2]} />
        <Rug position={[0, 0.01, 0.4]} size={[7, 3.4]} seed={5} />

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
    <div
      className="doc-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={doc.title}
      // Click the backdrop (but not the reader itself) to close.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
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
