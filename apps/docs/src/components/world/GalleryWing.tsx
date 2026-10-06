import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import { Book, Floor, Lake, Lamp, Rocks, Rug, registry, Sign, Trees, Wall } from '@runek/components'
import { isCompositeDef, WorldNodes } from '@runek/core'
import { type ComponentType, useMemo, useRef, useState } from 'react'
import {
  Box3,
  type BufferGeometry,
  type Group,
  type InstancedMesh,
  Matrix4,
  type Object3D,
  Vector3,
} from 'three'
import { PREVIEW } from '../../lib/preview'
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
const EXCLUDE = new Set(['Player', 'LightRig', 'Compass', 'Sky', 'Interactable'])

/** Per-exhibit props layered over the gallery-preview config. */
const TUNE: Record<string, Record<string, unknown>> = {
  // Ocean defaults to a 400-unit patch that follows the camera — pin a small pond.
  Ocean: { size: [7, 7], follow: false },
  // Bare visual — a dynamic body would roll off the pedestal.
  Sailboat: { physics: false },
  // A live portal navigates on contact; in the gallery it's display-only.
  Portal: { onEnter: () => {} },
}

/** The space a miniature may fill on its pedestal, in units: footprint and height. */
const FIT_SPAN = 1.3
const FIT_HEIGHT = 1.3

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
  props: Record<string, unknown>
  doc?: DocMeta
}

type Fit = { scale: number; offset: [number, number, number] }

/** One miniature: a component renders directly; a composite expands via the renderer. */
function Mini({ name, props }: { name: string; props: Record<string, unknown> }) {
  const entry = registry[name]
  if (isCompositeDef(entry)) {
    return (
      <WorldNodes
        nodes={[{ type: name, props: { seed: 7, ...(props as Record<string, never>) } }]}
        registry={registry}
      />
    )
  }
  const Component = entry as ComponentType<Record<string, unknown>>
  return <Component seed={7} {...props} />
}

/** Scale a measured box down to the pedestal, centered on it and resting on its top. */
function fitBox(box: Box3): Fit {
  if (box.isEmpty()) return { scale: 1, offset: [0, 0, 0] }
  const size = box.max.clone().sub(box.min)
  const scale = Math.min(
    1,
    FIT_SPAN / Math.max(size.x, size.z, 1e-3),
    FIT_HEIGHT / Math.max(size.y, 1e-3),
  )
  // A hair of lift keeps flat exhibits (water, rugs) from z-fighting the pedestal top.
  return {
    scale,
    offset: [
      (-(box.min.x + box.max.x) / 2) * scale,
      -box.min.y * scale + 0.01,
      (-(box.min.z + box.max.z) / 2) * scale,
    ],
  }
}

/** Bounds of everything under `root`, in its local space. Uses each geometry's own bounding
 *  box, which instanced text glyphs and scattered instances report correctly. */
function measure(root: Object3D): Box3 {
  root.updateWorldMatrix(true, true)
  const toLocal = new Matrix4().copy(root.matrixWorld).invert()
  const box = new Box3()
  const part = new Box3()
  root.traverse((o) => {
    const instanced = o as InstancedMesh
    const geometry = (o as { geometry?: BufferGeometry }).geometry
    if (instanced.isInstancedMesh) {
      instanced.computeBoundingBox()
      part.copy(instanced.boundingBox as Box3)
    } else if (geometry) {
      geometry.computeBoundingBox()
      // Text glyphs keep no bounds until their first layout.
      if (!geometry.boundingBox) return
      part.copy(geometry.boundingBox)
    } else return
    if (!part.isEmpty()) box.union(part.applyMatrix4(o.matrixWorld).applyMatrix4(toLocal))
  })
  return box
}

/** Frames a measurement must hold before it counts (text and instances fill in late); moving
 *  exhibits (birds, steam) settle within a small tolerance or at the frame cap. */
const SETTLE_FRAMES = 20
const MAX_FRAMES = 90

function settled(a: Box3 | null, b: Box3): boolean {
  if (!a || a.isEmpty() !== b.isEmpty()) return false
  if (b.isEmpty()) return true
  const tolerance = 0.02 * b.getSize(new Vector3()).length()
  return a.min.distanceTo(b.min) <= tolerance && a.max.distanceTo(b.max) <= tolerance
}

/**
 * Sizes any component to its pedestal: a hidden first mount is measured once its bounds
 * settle, then the miniature remounts scaled and centered, so its colliders match too.
 */
function FittedMini({ name, props }: { name: string; props: Record<string, unknown> }) {
  const [fit, setFit] = useState<Fit | null>(null)
  const probe = useRef<Group>(null)
  const frames = useRef(0)
  const steady = useRef(0)
  const last = useRef<Box3 | null>(null)
  useFrame(() => {
    if (fit || !probe.current) return
    const box = measure(probe.current)
    steady.current = settled(last.current, box) ? steady.current + 1 : 0
    last.current = box
    if (steady.current >= SETTLE_FRAMES || ++frames.current >= MAX_FRAMES) setFit(fitBox(box))
  })
  if (!fit)
    return (
      <group ref={probe} visible={false}>
        <Mini name={name} props={props} />
      </group>
    )
  return (
    <group position={fit.offset} scale={fit.scale}>
      <Mini name={name} props={props} />
    </group>
  )
}

function GuideBook({ doc, onSelect }: { doc: DocMeta; onSelect: (doc: DocMeta) => void }) {
  return (
    <group>
      {/* reading stand */}
      <mesh castShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[0.12, 0.6, 0.12]} />
        <meshStandardMaterial color="#3a2c1d" roughness={0.8} />
      </mesh>
      {/* the guide, opened on the stand and angled toward the visitor in the
          corridor (+z); the Book component owns the hover pop, cursor, and
          title label */}
      <group position={[0, 0.62, 0]} rotation={[0.5, 0, 0]}>
        <Book
          pose="open"
          width={0.17}
          height={0.26}
          thickness={0.06}
          color="#e0a96d"
          title={doc.title}
          onSelect={() => onSelect(doc)}
        />
      </group>
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
  const { name, props } = exhibit
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
      <group position={[0, 0.86, 0]}>
        <FittedMini name={name} props={props} />
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
    return Object.keys(registry)
      .filter((name) => !EXCLUDE.has(name))
      .map((name) => ({
        name,
        props: { ...PREVIEW[name]?.props, ...TUNE[name] },
        doc: bySlug.get(name.toLowerCase()),
      }))
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
        openings={[{ width: windowWidth, height: glassHeight, sill }]}
      />
      {/* the far end cap, with a doorway out to the show home on the lawn */}
      <Wall
        position={[endX - 0.1, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        width={WIDTH + 0.6}
        height={HEIGHT}
        openings={[{ width: 1.3, height: 2.4 }]}
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

      {/* the show home: a walkable House composite just past the end doorway —
          step out of the tunnel, in through its front door, and up the stairs.
          (A hair below the tunnel floor so the coplanar lawns never z-fight.) */}
      <Floor size={[13, 13]} position={[endX - 6, -0.01, 1]} color="#2e4234" />
      <WorldNodes
        nodes={[
          {
            type: 'House',
            props: {
              position: [endX - 6.5, 0, 1],
              rotation: [0, Math.PI / 2, 0],
              seed: 3,
            },
          },
        ]}
        registry={registry}
      />

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
