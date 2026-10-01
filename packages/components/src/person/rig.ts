// The three.js side of a figure: a skeleton from the spec's joints, skinned meshes bound to it, and
// the rigid pieces that ride a bone (eyeballs, blink lids, glasses, the staff).
import {
  Bone,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  Skeleton,
  SkinnedMesh,
  Sphere,
  TorusGeometry,
  Vector3,
} from 'three'
import type { BuiltFigure } from './build'
import { eyeGeometry, lidGeometry, personMaterials } from './materials'
import type { V3 } from './sdf'
import { BONES, type BoneName, PARENT, type Shape } from './shape'

export interface Rig {
  group: Group
  bones: Record<BoneName, Bone>
  skeleton: Skeleton
}

export function createRig(joints: V3[]): Rig {
  const group = new Group()
  const list = BONES.map((name) => {
    const b = new Bone()
    b.name = name
    return b
  })
  list.forEach((b, i) => {
    const j = joints[i]
    const p = PARENT[i] >= 0 ? joints[PARENT[i]] : [0, 0, 0]
    b.position.set(j[0] - p[0], j[1] - p[1], j[2] - p[2])
    if (PARENT[i] >= 0) list[PARENT[i]].add(b)
  })
  group.add(list[0])
  group.updateMatrixWorld(true)
  const skeleton = new Skeleton(list)
  const bones = Object.fromEntries(BONES.map((n, i) => [n, list[i]])) as Record<BoneName, Bone>
  return { group, bones, skeleton }
}

/** Skinned meshes for one build, bound to the rig's skeleton (the caller adds them to `rig.group`). */
export function skinnedMeshes(built: BuiltFigure, rig: Rig) {
  const materials = personMaterials()
  const bounds = new Sphere(new Vector3(0, built.height * 0.5, 0), built.height * 0.85)
  const meshes = built.parts.map((part) => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(part.positions, 3))
    g.setAttribute('normal', new BufferAttribute(part.normals, 3))
    g.setAttribute('color', new BufferAttribute(part.colors, 3))
    g.setAttribute('skinIndex', new BufferAttribute(part.skinIndex, 4))
    g.setAttribute('skinWeight', new BufferAttribute(part.skinWeight, 4))
    g.setIndex(new BufferAttribute(part.indices, 1))
    g.boundingSphere = bounds.clone()
    const mesh = new SkinnedMesh(g, materials[part.material])
    mesh.name = part.name
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.boundingSphere = bounds.clone()
    mesh.bind(rig.skeleton, new Matrix4())
    return mesh
  })
  return {
    meshes,
    dispose: () => {
      for (const m of meshes) {
        m.removeFromParent()
        m.geometry.dispose()
      }
    },
  }
}

export interface Attachments {
  eyes: Object3D[]
  lids: Object3D[]
  /** Glasses and staff. */
  props: Object3D[]
  dispose: () => void
}

/** Eyeballs and blink lids on the head bone, glasses on the face, the staff in the right hand. */
export function attach(
  rig: Rig,
  shape: Shape,
  joints: V3[],
  eyeColor: string,
  skinColor: string,
  metal: string,
  wood: string,
): Attachments {
  const head = rig.bones.head
  const hj = joints[BONES.indexOf('head')]
  const local = (p: V3): V3 => [p[0] - hj[0], p[1] - hj[1], p[2] - hj[2]]
  const owned: { obj: Object3D; geo: BufferGeometry[]; mat?: MeshPhysicalMaterial }[] = []
  const props: Object3D[] = []
  const materials = personMaterials()
  const eyes: Object3D[] = []
  const lids: Object3D[] = []
  for (const e of shape.eyes) {
    const pivot = new Object3D()
    pivot.position.set(...local(e.center))
    const eyeGeo = eyeGeometry(e.radius, eyeColor, 40)
    pivot.add(new Mesh(eyeGeo, materials.eye))
    head.add(pivot)
    eyes.push(pivot)
    const lidPivot = new Object3D()
    lidPivot.position.set(...local(e.center))
    const lidGeo = lidGeometry(shape.lidRadius, skinColor)
    lidPivot.add(new Mesh(lidGeo, materials.skin))
    head.add(lidPivot)
    lids.push(lidPivot)
    owned.push({ obj: pivot, geo: [eyeGeo] }, { obj: lidPivot, geo: [lidGeo] })
  }
  const g = shape.props.glasses
  if (g) {
    const frame = new Group()
    frame.position.set(...local(g.center))
    const mat = new MeshPhysicalMaterial({ color: metal, roughness: 0.4, metalness: 0.6 })
    const ring = new TorusGeometry(g.ring, g.tube, 6, 24)
    const bridge = new CylinderGeometry(g.tube, g.tube, g.spacing * 2 - g.ring * 2, 6)
    for (const s of [-1, 1]) {
      const m = new Mesh(ring, mat)
      m.position.x = s * g.spacing
      frame.add(m)
    }
    const b = new Mesh(bridge, mat)
    b.rotation.z = Math.PI / 2
    b.position.y = g.ring * 0.35
    frame.add(b)
    head.add(frame)
    props.push(frame)
    owned.push({ obj: frame, geo: [ring, bridge], mat })
  }
  const st = shape.props.staff
  if (st) {
    const hand = rig.bones['hand.R']
    const wrist = joints[BONES.indexOf('hand.R')]
    const geo = new CylinderGeometry(st.radius, st.radius, st.length, 7)
    const mat = new MeshPhysicalMaterial({ color: wood, roughness: 0.85 })
    const m = new Mesh(geo, mat)
    // Held through the fist, its foot on the ground.
    m.position.set(-st.radius * 0.5, st.length / 2 - wrist[1], st.radius * 2.6)
    m.castShadow = true
    hand.add(m)
    props.push(m)
    owned.push({ obj: m, geo: [geo], mat })
  }
  return {
    eyes,
    lids,
    props,
    dispose: () => {
      for (const o of owned) {
        o.obj.removeFromParent()
        for (const geo of o.geo) geo.dispose()
        o.mat?.dispose()
      }
    },
  }
}
