import { useRapier } from '@react-three/rapier'
import { useContext, useEffect, useRef } from 'react'
import { Color, Euler, Group, type Material, Mesh, Object3D, Quaternion } from 'three'
import { type Built, shapeGeometry } from './build'
import { WorldContext } from './context'
import { type LightEmitter, LightPoolContext } from './light'
import {
  lookMaterial,
  materialKey,
  releaseMaterial,
  retainMaterial,
  slotResolver,
} from './material'
import type { Vec3 } from './types'

/** One node to mount from its build. */
export interface BuiltNode {
  key: string
  built: Built
  position: Vec3
  rotation: Vec3
}

type RapierBody = { handle: number }

interface Mounted {
  group: Group
  materials: string[]
  body: RapierBody | null
  emitters: LightEmitter[]
}

const euler = new Euler()
const quaternion = new Quaternion()

const toQuaternion = (rotation: Vec3 | undefined) =>
  quaternion.setFromEuler(euler.set(...(rotation ?? [0, 0, 0])))

/**
 * Mount nodes from their builds, without a React component per node: meshes straight into the
 * scene on shared materials (so the static batcher takes them as usual), colliders straight into
 * the physics world, lights into the world's light pool. Adding or dropping a node touches only
 * that node. What a streamed world uses for components that have a `build`.
 */
export function BuiltNodes({ items }: { items: BuiltNode[] }) {
  const root = useRef<Group>(null)
  const { world, rapier } = useRapier()
  const slots = useContext(WorldContext).materials
  const emitterSet = useContext(LightPoolContext)
  const mounted = useRef(new Map<string, Mounted>())

  useEffect(() => {
    const group = root.current
    if (!group) return
    const live = mounted.current
    const wanted = new Map(items.map((item) => [item.key, item]))

    for (const [key, node] of live) {
      if (wanted.has(key)) continue
      unmount(node)
      live.delete(key)
    }
    for (const item of items) {
      if (live.has(item.key)) continue
      live.set(item.key, mount(item, group))
    }

    function mount({ built, position, rotation }: BuiltNode, parent: Group): Mounted {
      const node = new Group()
      node.position.set(...position)
      node.rotation.set(...rotation)
      const retained: string[] = []
      for (const part of built.parts) {
        const key = materialKey(part.look)
        const material = lookMaterial(part.look, slots, key) as Material
        if (!slotResolver(part.look, slots)) {
          retainMaterial(key)
          retained.push(key)
        }
        const mesh = new Mesh(shapeGeometry(part.shape), material)
        if (part.position) mesh.position.set(...part.position)
        if (part.rotation) mesh.rotation.set(...part.rotation)
        mesh.castShadow = !!part.castShadow
        mesh.receiveShadow = !!part.receiveShadow
        node.add(mesh)
      }
      parent.add(node)

      let body: RapierBody | null = null
      if (built.colliders?.length) {
        const q = toQuaternion(rotation)
        const created = world.createRigidBody(
          rapier.RigidBodyDesc.fixed()
            .setTranslation(...position)
            .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }),
        )
        for (const c of built.colliders) {
          const cq = toQuaternion(c.rotation)
          const desc = rapier.ColliderDesc.cuboid(...c.cuboid)
            .setTranslation(...(c.position ?? [0, 0, 0]))
            .setRotation({ x: cq.x, y: cq.y, z: cq.z, w: cq.w })
          world.createCollider(desc, created)
        }
        body = created
      }

      const emitters: LightEmitter[] = []
      for (const light of built.lights ?? []) {
        const at = new Object3D()
        at.position.set(...light.position)
        node.add(at)
        let target: Object3D | null = null
        if (light.target) {
          target = new Object3D()
          target.position.set(...light.target)
          node.add(target)
        }
        const look = light.look
        const emitter: LightEmitter = {
          ref: { current: at },
          target: { current: target },
          kind: look.kind ?? 'point',
          color: new Color(look.color ?? '#ffffff'),
          intensity: look.intensity ?? 1,
          distance: look.distance ?? 0,
          decay: look.decay ?? 2,
          angle: look.angle ?? Math.PI / 3,
          penumbra: look.penumbra ?? 0,
          enabled: true,
        }
        emitterSet?.add(emitter)
        emitters.push(emitter)
      }
      return { group: node, materials: retained, body, emitters }
    }

    function unmount(node: Mounted) {
      node.group.removeFromParent()
      for (const key of node.materials) releaseMaterial(key)
      if (node.body) world.removeRigidBody(node.body as never)
      for (const emitter of node.emitters) emitterSet?.delete(emitter)
    }
  }, [items, world, rapier, slots, emitterSet])

  useEffect(
    () => () => {
      for (const node of mounted.current.values()) {
        node.group.removeFromParent()
        for (const key of node.materials) releaseMaterial(key)
        if (node.body) world.removeRigidBody(node.body as never)
        for (const emitter of node.emitters) emitterSet?.delete(emitter)
      }
      mounted.current.clear()
    },
    [world, emitterSet],
  )

  return <group ref={root} />
}
