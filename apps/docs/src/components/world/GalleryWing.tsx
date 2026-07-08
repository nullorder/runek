import { Html } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import { Floor, Lake, Lamp, registry, Rocks, Rug, Sign, Trees, Wall } from '@runek/components'
import { type ComponentType, useMemo, useState } from 'react'
import { DEFAULT_CAMERA, PREVIEW } from '../../lib/preview'
import type { DocMeta } from './LibraryWorld'

/**
 * The component gallery: one long tunnel running straight out from the
 * library's doorway (-x). Every placeable component from the registry stands
 * as a live miniature on a pedestal along the south (-z) wall, with its name
 * behind it and a clickable guide book in front that opens the component's
 * doc. The north (+z) wall is a continuous ribbon window onto the grounds
 * outside, so the walk from one end to the other keeps the night in view.
 */

/** System components with nothing to put on a pedestal. */
const EXCLUDE = new Set(['Player', 'LightRig', 'Compass', 'Sky'])

/**
 * Per-exhibit overrides layered over the gallery-preview config: `props` merge
 * over `PREVIEW[name].props`, `scale` replaces the camera-derived miniature
 * scale, `lift` raises center-origin components (in scaled units) so they
 * don't sink into the pedestal.
 */
const TUNE: Record<string, { props?: Record<string, unknown>; scale?: number; lift?: number }> = {
  // Ocean defaults to a 400-unit patch that follows the camera — pin a small pond.
  Ocean: { props: { size: [7, 7], follow: false }, scale: 0.18 },
  // The preview terrain is 30 units across; shrink it to the pedestal.
  Terrain: { scale: 0.05 },
  // Bare visual — a dynamic body would roll off the pedestal.
  Sailboat: { props: { physics: false }, scale: 0.25 },
  // A live portal navigates on contact; in the gallery it's display-only.
  Portal: { props: { onEnter: () => {} } },
  // Center-origin components: lift so they sit above the pedestal top.
  Clock: { lift: 0.55 },
  Sign: { lift: 0.5 },
  Window: { lift: 0.55 },
  // Components with no tuned preview camera get the default miniature scale,
  // which overflows the pedestal for the large ones — scale ≈ 1.5 / max extent.
  Dock: { scale: 0.15 },
  Floor: { scale: 0.19 },
  Road: { scale: 0.12 },
  Cliff: { scale: 0.12 },
  Counter: { scale: 0.45 },
  Hut: { scale: 0.22 },
  Tent: { scale: 0.4 },
  Signpost: { scale: 0.4 },
  Lake: { scale: 0.075 },
  Shore: { scale: 0.06 },
  Fence: { scale: 0.25 },
}

/** Tunnel geometry, in units. It begins at the library's right wall (x = -7)
 * and runs along -x; interior width 5 (z ∈ [-2.5, 2.5]), matching the door. */
const ENTRY_X = -7
const WIDTH = 5
const HEIGHT = 4.5
const SPACING = 2.6
const FIRST_X = ENTRY_X - 3 // a breath of empty floor inside the door
const SOUTH_Z = -(WIDTH / 2 + 0.1) // exhibits wall center
const NORTH_Z = WIDTH / 2 + 0.1 // window wall center

type Exhibit = {
  name: string
  Component: ComponentType<Record<string, unknown>>
  props: Record<string, unknown>
  scale: number
  lift: number
  doc?: DocMeta
}

/** Miniature scale from the 2D gallery's tuned camera distance: a preview
 * camera frames its subject, so distance is a good proxy for component size. */
function miniScale(name: string): number {
  const cam = PREVIEW[name]?.camera ?? DEFAULT_CAMERA
  const dist = Math.hypot(...cam)
  return Math.min(1, 2.3 / dist)
}

function GuideBook({
  doc,
  onSelect,
}: {
  doc: DocMeta
  onSelect: (doc: DocMeta) => void
}) {
  const [hot, setHot] = useState(false)
  return (
    <group>
      {/* reading stand */}
      <mesh castShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[0.12, 0.6, 0.12]} />
        <meshStandardMaterial color="#3a2c1d" roughness={0.8} />
      </mesh>
      {/* the guide, angled toward the visitor */}
      <mesh
        castShadow
        position={[0, 0.63, 0]}
        rotation={[-0.5, 0, 0]}
        scale={hot ? 1.15 : 1}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(doc)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHot(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHot(false)
          document.body.style.cursor = 'auto'
        }}
      >
        <boxGeometry args={[0.34, 0.07, 0.26]} />
        <meshStandardMaterial color={hot ? '#f0c084' : '#e0a96d'} roughness={0.7} />
      </mesh>
      {hot && (
        <Html position={[0, 0.95, 0]} center distanceFactor={6} zIndexRange={[30, 0]}>
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
            {doc.title}
          </div>
        </Html>
      )}
    </group>
  )
}

function ExhibitStand({
  exhibit,
  position,
  onSelect,
}: {
  exhibit: Exhibit
  position: [number, number, number]
  onSelect: (doc: DocMeta) => void
}) {
  const { name, Component, props, scale, lift } = exhibit
  return (
    // Backed against the south wall, facing the window (+z).
    <group position={position}>
      {/* pedestal */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh castShadow receiveShadow position={[0, 0.425, 0]}>
          <boxGeometry args={[1.5, 0.85, 1.5]} />
          <meshStandardMaterial color="#6b5138" roughness={0.85} />
        </mesh>
      </RigidBody>

      {/* the miniature, live and procedural like everything else */}
      <group position={[0, 0.86 + lift * scale, 0]} scale={scale}>
        <Component seed={7} {...props} />
      </group>

      {/* nameplate just proud of the wall face behind the pedestal */}
      <Sign position={[0, 2.35, -0.82]} size={0.11} letterSpacing={0.02} color="#4a3726">
        {name}
      </Sign>

      {/* the integration guide, on a stand toward the corridor */}
      {exhibit.doc && (
        <group position={[0, 0, 1.15]}>
          <GuideBook doc={exhibit.doc} onSelect={onSelect} />
        </group>
      )}
    </group>
  )
}

export default function GalleryWing({
  componentDocs,
  onSelect,
}: {
  componentDocs: DocMeta[]
  onSelect: (doc: DocMeta) => void
}) {
  const exhibits = useMemo<Exhibit[]>(() => {
    const bySlug = new Map(componentDocs.map((d) => [d.component ?? '', d]))
    return Object.entries(registry)
      .filter(([name]) => !EXCLUDE.has(name))
      .map(([name, Component]) => {
        const tune = TUNE[name]
        return {
          name,
          Component: Component as ComponentType<Record<string, unknown>>,
          props: { ...PREVIEW[name]?.props, ...tune?.props },
          scale: tune?.scale ?? miniScale(name),
          lift: tune?.lift ?? 0,
          doc: bySlug.get(name.toLowerCase()),
        }
      })
  }, [componentDocs])

  // One straight run: exhibit i stands at FIRST_X - i·SPACING; the tunnel ends
  // a few units past the last pedestal.
  const lastX = FIRST_X - (exhibits.length - 1) * SPACING
  const endX = lastX - 3.2
  const length = ENTRY_X - endX
  const centerX = (ENTRY_X + endX) / 2

  // The ribbon window: one opening nearly the full wall, glazed. The low sill
  // keeps walkers in; the glass pane (with its own thin collider) keeps
  // jumpers in without blocking the view.
  const windowWidth = length - 4
  const sill = 1.05
  const glassHeight = 1.7

  const lampXs = useMemo(() => {
    const out: number[] = []
    for (let x = ENTRY_X - 9; x > endX + 4; x -= 18) out.push(x)
    return out
  }, [endX])

  return (
    <group>
      {/* shell: floor, solid exhibit wall (-z), glazed window wall (+z), far end cap */}
      <Floor size={[length + 0.6, WIDTH + 0.4]} position={[centerX, 0, 0]} color="#b9b2a4" />
      {/* the long walls run along x — unrotated, a Wall's width spans local x */}
      <Wall position={[centerX, 0, SOUTH_Z]} width={length + 0.4} height={HEIGHT} />
      <Wall
        position={[centerX, 0, NORTH_Z]}
        width={length + 0.4}
        height={HEIGHT}
        opening={{ width: windowWidth, height: glassHeight, sill }}
      />
      <Wall
        position={[endX - 0.1, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        width={WIDTH + 0.6}
        height={HEIGHT}
      />

      {/* glazing: a translucent pane filling the opening, with a thin collider */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[centerX, sill + glassHeight / 2, NORTH_Z]}>
          <boxGeometry args={[windowWidth, glassHeight, 0.05]} />
          <meshStandardMaterial
            color="#bfd8e8"
            transparent
            opacity={0.12}
            roughness={0.15}
            metalness={0}
          />
        </mesh>
      </RigidBody>
      {/* mullions pacing the ribbon window */}
      {lampXs.map((x) => (
        <mesh key={`mullion-${x}`} position={[x + 9, sill + glassHeight / 2, NORTH_Z]}>
          <boxGeometry args={[0.09, glassHeight, 0.14]} />
          <meshStandardMaterial color="#4a3726" roughness={0.8} />
        </mesh>
      ))}

      {/* the grounds outside the window: a moonlit lawn with a pond and trees.
          The lawn stops at the tunnel mouth (x = ENTRY_X) so it never pokes
          into the library floor. */}
      <Floor size={[length, 26]} position={[centerX, 0, NORTH_Z + 13]} color="#2e4234" />
      <Lake size={[9, 7]} position={[centerX - 8, 0, NORTH_Z + 12]} />
      {[0.1, 0.24, 0.38, 0.52, 0.66, 0.8, 0.92].map((f, i) => (
        <Trees
          key={`tree-${f}`}
          position={[ENTRY_X - f * length, 0, NORTH_Z + 7 + ((i * 5) % 11)]}
          seed={i + 4}
        />
      ))}
      <Rocks position={[ENTRY_X - 0.5 * length, 0, NORTH_Z + 6]} seed={11} />
      <Rocks position={[ENTRY_X - 0.92 * length, 0, NORTH_Z + 10]} seed={12} />

      {/* a runner rug the length of the walk, and lamps to read the exhibits by */}
      <Rug position={[centerX, 0.01, 0.7]} size={[length - 6, 2]} seed={9} />
      {lampXs.map((x) => (
        <Lamp key={`lamp-${x}`} position={[x, 0, 1.6]} />
      ))}

      {/* wayfinding: the gallery name on the far end wall, drawing you down the
          tunnel, and a pointer back to the library above the entrance */}
      <Sign
        position={[endX + 0.12, 3, 0]}
        rotation={[0, Math.PI / 2, 0]}
        size={0.28}
        letterSpacing={0.05}
        color="#3df58a"
        glow
      >
        The Gallery
      </Sign>
      <Sign
        position={[ENTRY_X - 0.12, 3.35, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        size={0.13}
        letterSpacing={0.02}
        color="#e3cd96"
      >
        ← Library
      </Sign>

      {exhibits.map((exhibit, i) => (
        <ExhibitStand
          key={exhibit.name}
          exhibit={exhibit}
          position={[FIRST_X - i * SPACING, 0, SOUTH_Z + 0.95]}
          onSelect={onSelect}
        />
      ))}
    </group>
  )
}
