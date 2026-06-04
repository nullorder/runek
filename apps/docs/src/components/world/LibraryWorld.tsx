import { Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { Bookshelf, LightRig, Player, Room, Sky } from '@runek/components'
import { World } from '@runek/core'
import { useEffect, useState } from 'react'

export type DocMeta = {
  slug: string
  title: string
  summary: string
  category: string
}

const CATEGORY_COLOR: Record<string, string> = {
  intro: '#7c9cff',
  guide: '#5fd0a8',
  component: '#e0a96d',
  reference: '#c08cf0',
}

const SPREAD = 0.9

export default function LibraryWorld({ docs }: { docs: DocMeta[] }) {
  const [selected, setSelected] = useState<DocMeta | null>(null)

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <World lights={false} onPointerMissed={() => setSelected(null)}>
        <Sky />
        <LightRig sunPosition={[4, 16, -8]} ambient={0.6} />
        <Room size={[14, 14]} height={4.5} doorWidth={0} color="#b9b2a4" />

        {/* Atmosphere: decorative shelves lining the far wall, facing the visitor. */}
        <Bookshelf position={[-5, 1, 6.5]} rotation={[0, Math.PI, 0]} seed={3} />
        <Bookshelf position={[-3.4, 1, 6.5]} rotation={[0, Math.PI, 0]} seed={7} />
        <Bookshelf position={[3.4, 1, 6.5]} rotation={[0, Math.PI, 0]} seed={11} />
        <Bookshelf position={[5, 1, 6.5]} rotation={[0, Math.PI, 0]} seed={17} />

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
      <DocCard doc={doc} onClose={onClose} />
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

function DocCard({ doc, onClose }: { doc: DocMeta; onClose: () => void }) {
  return (
    <div className="doc-card">
      <div className="row">
        <span className="eyebrow">{doc.category}</span>
        <button type="button" className="close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <h3>{doc.title}</h3>
      <p>{doc.summary}</p>
      <a className="btn primary" href={`/docs/${doc.slug}`}>
        Open full page →
      </a>
    </div>
  )
}
