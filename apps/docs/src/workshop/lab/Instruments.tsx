import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Person } from '@runek/components'
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box3,
  type Box3Helper,
  InstancedMesh,
  type Material,
  Mesh,
  type Object3D,
  Vector3,
} from 'three'
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper.js'

const box = new Box3()
const size = new Vector3()

/** Materials switched to wireframe while mounted; restored on unmount or rebuild. */
export function Wireframe({
  target,
  version,
}: {
  target: RefObject<Object3D | null>
  version: string
}) {
  useEffect(() => {
    const changed = new Map<Material, boolean>()
    const apply = () => {
      target.current?.traverse((o) => {
        if (!(o instanceof Mesh)) return
        for (const m of ([] as Material[]).concat(o.material)) {
          if ('wireframe' in m && !changed.has(m)) {
            changed.set(m, (m as Material & { wireframe: boolean }).wireframe)
            ;(m as Material & { wireframe: boolean }).wireframe = true
          }
        }
      })
    }
    apply()
    // Late builds (time-sliced figures) add meshes after mount.
    const timer = setInterval(apply, 500)
    return () => {
      clearInterval(timer)
      for (const [m, was] of changed) (m as Material & { wireframe: boolean }).wireframe = was
    }
  }, [target, version])
  return null
}

const NORMALS_VERTEX_LIMIT = 40000

/** Vertex normals as short lines, for meshes small enough to draw them readably. */
export function Normals({
  target,
  version,
}: {
  target: RefObject<Object3D | null>
  version: string
}) {
  const [helpers, setHelpers] = useState<VertexNormalsHelper[]>([])
  const [skipped, setSkipped] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => {
      const made: VertexNormalsHelper[] = []
      let skip = 0
      target.current?.traverse((o) => {
        if (!(o instanceof Mesh) || o instanceof InstancedMesh || !o.geometry.attributes.normal)
          return
        if (o.geometry.attributes.position.count > NORMALS_VERTEX_LIMIT) {
          skip++
          return
        }
        made.push(new VertexNormalsHelper(o, 0.05, 0x2aa7ff))
      })
      setHelpers(made)
      setSkipped(skip)
    }, 600)
    return () => clearTimeout(t)
  }, [target, version])
  useEffect(
    () => () => {
      for (const h of helpers) h.dispose()
    },
    [helpers],
  )
  useFrame(() => {
    for (const h of helpers) h.update()
  })
  return (
    <>
      {helpers.map((h) => (
        <primitive key={h.uuid} object={h} />
      ))}
      {skipped > 0 && (
        <Html position={[0, -0.2, 0]} center className="ws-tag">
          {skipped} dense mesh{skipped > 1 ? 'es' : ''} skipped
        </Html>
      )}
    </>
  )
}

/** The subject's bounding box with its size in meters. */
export function Bounds({ target }: { target: RefObject<Object3D | null> }) {
  const helper = useRef<Box3Helper>(null)
  const shape = useMemo(() => new Box3(), [])
  const [label, setLabel] = useState<{ text: string; at: [number, number, number] } | null>(null)
  useFrame(() => {
    if (!target.current || !helper.current) return
    box.setFromObject(target.current)
    if (box.isEmpty()) return
    shape.copy(box)
    box.getSize(size)
    const text = `${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} m`
    if (text !== label?.text)
      setLabel({
        text,
        at: [(box.min.x + box.max.x) / 2, box.max.y + 0.2, (box.min.z + box.max.z) / 2],
      })
  })
  return (
    <>
      <box3Helper ref={helper} args={[shape, '#3df58a']} />
      {label && (
        <Html position={label.at} center className="ws-tag ws-tag--size">
          {label.text}
        </Html>
      )}
    </>
  )
}

/** A 1.8 m figure and a 1 m ruler beside the subject, for scale. */
export function ScaleReference({ target }: { target: RefObject<Object3D | null> }) {
  const [x, setX] = useState(-1.2)
  const [base, setBase] = useState(0)
  useFrame(() => {
    if (!target.current) return
    box.setFromObject(target.current)
    if (box.isEmpty()) return
    const next = Math.round((box.min.x - 0.7) * 20) / 20
    if (next !== x) setX(next)
    const y = Math.round(box.min.y * 20) / 20
    if (y !== base) setBase(y)
  })
  return (
    <group position={[x, base, 0]}>
      <Person height={1.8} seed={11} detail="low" lookAt={false} physics={false} />
      <group position={[-0.6, 0, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.03, 1, 0.03]} />
          <meshBasicMaterial color="#ffcf5a" />
        </mesh>
        {Array.from({ length: 11 }, (_, i) => (
          <mesh key={i} position={[0.03, i / 10, 0]}>
            <boxGeometry args={[i % 5 === 0 ? 0.12 : 0.06, 0.006, 0.01]} />
            <meshBasicMaterial color="#ffcf5a" />
          </mesh>
        ))}
        <Html position={[0, 1.12, 0]} center className="ws-tag">
          1 m
        </Html>
      </group>
    </group>
  )
}
