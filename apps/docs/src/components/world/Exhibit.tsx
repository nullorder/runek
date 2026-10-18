import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import { Book, registry, Sign } from '@runek/components'
import { isCompositeDef, WorldNodes } from '@runek/core'
import { type ComponentType, useRef, useState } from 'react'
import {
  Box3,
  type BufferGeometry,
  type Group,
  type InstancedMesh,
  Matrix4,
  type Object3D,
  Vector3,
} from 'three'
import type { DocMeta } from './LibraryWorld'

/**
 * One gallery exhibit: a live miniature fitted to its pedestal, its name on the wall behind,
 * and a clickable guide book in front that opens the component's doc. The stand and the
 * miniature mount separately so the miniatures can live in their own physics world: while a
 * miniature is measured its colliders are full size (a `Shore` is 24 m across), and in the
 * visitor's world they would block or shove the avatar.
 */

/** The space a miniature may fill on its pedestal, in units: footprint and height. */
const FIT_SPAN = 1.3
const FIT_HEIGHT = 1.3

export type Exhibit = {
  name: string
  category: string
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
 * settle, then the miniature remounts scaled and centered, so its colliders match too. The
 * distinct keys force that remount: Rapier reads a collider's scale only when it is created,
 * so updating the same group's scale in place would leave full-size colliders behind.
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
      <group key="probe" ref={probe} visible={false}>
        <Mini name={name} props={props} />
      </group>
    )
  return (
    <group key="fit" position={fit.offset} scale={fit.scale}>
      <Mini name={name} props={props} />
    </group>
  )
}

function GuideBook({
  doc,
  color,
  onSelect,
}: {
  doc: DocMeta
  color: string
  onSelect: (doc: DocMeta) => void
}) {
  return (
    <group>
      {/* reading stand */}
      <mesh castShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[0.12, 0.6, 0.12]} />
        <meshStandardMaterial color="#3a2c1d" roughness={0.8} />
      </mesh>
      {/* the guide, opened on the stand and angled toward the visitor (+z); the Book
          component owns the hover pop, cursor, and title label */}
      <group position={[0, 0.62, 0]} rotation={[0.5, 0, 0]}>
        <Book
          pose="open"
          width={0.17}
          height={0.26}
          thickness={0.06}
          color={color}
          title={doc.title}
          onSelect={() => onSelect(doc)}
        />
      </group>
    </group>
  )
}

/** The miniature, standing on the pedestal of the `ExhibitStand` at the same spot. */
export function ExhibitMini({
  exhibit,
  position,
  rotation,
}: {
  exhibit: Exhibit
  position: [number, number, number]
  rotation: number
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group position={[0, 0.86, 0]}>
        <FittedMini name={exhibit.name} props={exhibit.props} />
      </group>
    </group>
  )
}

/**
 * Built backed against a wall at local -z, facing +z; `rotation` turns it to face the room.
 * `section` labels the wall above the first exhibit of a category run.
 */
export function ExhibitStand({
  exhibit,
  position,
  rotation,
  accent,
  section,
  onSelect,
}: {
  exhibit: Exhibit
  position: [number, number, number]
  rotation: number
  accent: string
  section?: string
  onSelect: (doc: DocMeta) => void
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* pedestal */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh castShadow receiveShadow position={[0, 0.425, 0]}>
          <boxGeometry args={[1.5, 0.85, 1.5]} />
          <meshStandardMaterial color="#6b5138" roughness={0.85} />
        </mesh>
      </RigidBody>

      {/* nameplate just proud of the wall face behind the pedestal */}
      <Sign position={[0, 2.35, -0.82]} size={0.11} letterSpacing={0.02} color="#4a3726">
        {exhibit.name}
      </Sign>
      {section && (
        <Sign position={[0, 2.85, -0.82]} size={0.17} letterSpacing={0.04} color={accent} glow>
          {section}
        </Sign>
      )}

      {/* the integration guide, on a stand toward the room */}
      {exhibit.doc && (
        <group position={[0, 0, 1.15]}>
          <GuideBook doc={exhibit.doc} color={accent} onSelect={onSelect} />
        </group>
      )}
    </group>
  )
}
