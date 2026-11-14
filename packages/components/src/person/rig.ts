// The three.js side of a figure: a skeleton from the spec's joints, skinned meshes bound to it, and
// the rigid pieces that ride a bone (eyeballs, blink lids, glasses, the staff).
import {
  Bone,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  Group,
  type Material,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  Quaternion,
  Skeleton,
  SkinnedMesh,
  Sphere,
  TorusGeometry,
  Vector3,
} from 'three'
import type { BuiltFigure, BuiltPart } from './build'
import type { Humanoid, HumanoidBoneName } from './humanoid'
import {
  drawnEyeGeometry,
  drawnLidGeometry,
  drawnMaterials,
  eyeGeometry,
  inkMaterial,
  lidGeometry,
  personMaterials,
  type ToonMaker,
} from './materials'
import type { V3 } from './sdf'
import { BONES, type BoneName, PARENT, type Shape } from './shape'

export interface Rig {
  group: Group
  bones: Record<BoneName, Bone>
  skeleton: Skeleton
  /** The bones under their VRM humanoid names, for `applyPose`. */
  humanoid: Humanoid
}

/** Each bone's humanoid name. `root`, the figure's footprint on the ground, has none. */
const HUMANOID_NAME: Partial<Record<BoneName, HumanoidBoneName>> = {
  pelvis: 'hips',
  spine: 'spine',
  chest: 'chest',
  neck: 'neck',
  head: 'head',
  'upperArm.L': 'leftUpperArm',
  'foreArm.L': 'leftLowerArm',
  'hand.L': 'leftHand',
  'upperArm.R': 'rightUpperArm',
  'foreArm.R': 'rightLowerArm',
  'hand.R': 'rightHand',
  'thigh.L': 'leftUpperLeg',
  'shin.L': 'leftLowerLeg',
  'foot.L': 'leftFoot',
  'thigh.R': 'rightUpperLeg',
  'shin.R': 'rightLowerLeg',
  'foot.R': 'rightFoot',
}

/** Each bone's rotation in the canonical T-pose, in the figure's frame. Every bone is unrotated in
 *  the bind pose, so the torso, head and feet already stand as they would; arms swing out level
 *  along ±X (palms down) and legs straighten, each segment from its own joints, whatever the
 *  proportions. */
function tPose(joints: V3[]): Quaternion[] {
  const at = (n: BoneName) => new Vector3(...joints[BONES.indexOf(n)])
  const along = (from: BoneName, to: BoneName, dir: Vector3) =>
    new Quaternion().setFromUnitVectors(at(to).sub(at(from)).normalize(), dir)
  const t = BONES.map(() => new Quaternion())
  const set = (n: BoneName, q: Quaternion) => {
    t[BONES.indexOf(n)] = q
  }
  const down = new Vector3(0, -1, 0)
  for (const [side, x] of [
    ['L', 1],
    ['R', -1],
  ] as const) {
    const out = new Vector3(x, 0, 0)
    set(`upperArm.${side}`, along(`upperArm.${side}`, `foreArm.${side}`, out))
    const fore = along(`foreArm.${side}`, `hand.${side}`, out)
    set(`foreArm.${side}`, fore)
    set(`hand.${side}`, fore.clone())
    set(`thigh.${side}`, along(`thigh.${side}`, `shin.${side}`, down))
    set(`shin.${side}`, along(`shin.${side}`, `foot.${side}`, down))
  }
  return t
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
  const t = tPose(joints)
  const humanoid: Humanoid = {}
  BONES.forEach((n, i) => {
    const name = HUMANOID_NAME[n]
    if (!name) return
    humanoid[name] = {
      bone: list[i],
      pre: PARENT[i] >= 0 ? t[PARENT[i]].clone().invert() : new Quaternion(),
      post: t[i],
      rest: list[i].position.clone(),
    }
  })
  return { group, bones, skeleton, humanoid }
}

/**
 * The parts of a far figure joined into as few meshes as there are materials among them. Every
 * part carries its color in its vertices and is skinned to the same skeleton, so parts that share
 * a material draw as one. A drawn figure's materials differ only in the strength of their rim
 * light, which is lost at that distance, so all of it goes into one mesh.
 */
function mergeParts(parts: BuiltPart[], drawn: boolean): BuiltPart[] {
  const groups = new Map<BuiltPart['material'], BuiltPart[]>()
  for (const part of parts) {
    const key = drawn ? 'cloth' : part.material
    const list = groups.get(key)
    if (list) list.push(part)
    else groups.set(key, [part])
  }
  return [...groups.entries()].map(([material, list]) => {
    if (list.length === 1) return { ...list[0], material }
    const verts = list.reduce((n, p) => n + p.positions.length / 3, 0)
    const merged: BuiltPart = {
      name: 'far',
      material,
      positions: new Float32Array(verts * 3),
      normals: new Float32Array(verts * 3),
      colors: new Float32Array(verts * 3),
      skinIndex: new Uint16Array(verts * 4),
      skinWeight: new Float32Array(verts * 4),
      indices: new Uint32Array(list.reduce((n, p) => n + p.indices.length, 0)),
    }
    let v = 0
    let i = 0
    for (const p of list) {
      merged.positions.set(p.positions, v * 3)
      merged.normals.set(p.normals, v * 3)
      merged.colors.set(p.colors, v * 3)
      merged.skinIndex.set(p.skinIndex, v * 4)
      merged.skinWeight.set(p.skinWeight, v * 4)
      for (let k = 0; k < p.indices.length; k++) merged.indices[i + k] = p.indices[k] + v
      v += p.positions.length / 3
      i += p.indices.length
    }
    return merged
  })
}

/** Skinned meshes for one build, bound to the rig's skeleton (the caller adds them to `rig.group`).
 *  Under `WebGPURenderer`, `skin` is the skin's node twin and `toon` makes a drawn figure's. */
export function skinnedMeshes(built: BuiltFigure, rig: Rig, skin?: Material, toon?: ToonMaker) {
  const materials = built.drawn ? drawnMaterials(toon) : personMaterials(skin)
  /** The ink lines of a drawn figure, one per mesh: shown and hidden together (see `Person`). */
  const lines: SkinnedMesh[] = []
  const bounds = new Sphere(new Vector3(0, built.height * 0.5, 0), built.height * 0.85)
  // A far figure is one mesh for each material, not one for each garment.
  const parts = built.lod === 'far' ? mergeParts(built.parts, built.drawn) : built.parts
  const meshes = parts.map((part) => {
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
    // A drawn figure gets an ink line round every part but the brow and lash strokes, which are
    // ink already. Under WebGPURenderer it does without (the line is a GLSL patch).
    if (built.drawn && !toon && part.name !== 'brows' && part.name !== 'lashes') {
      const line = new SkinnedMesh(g, inkMaterial())
      line.name = 'person:ink'
      line.castShadow = false
      line.receiveShadow = false
      line.boundingSphere = bounds.clone()
      line.raycast = () => {}
      line.bind(rig.skeleton, new Matrix4())
      mesh.add(line)
      lines.push(line)
    }
    return mesh
  })
  return {
    meshes,
    lines,
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
  skin?: Material,
  toon?: ToonMaker,
): Attachments {
  const head = rig.bones.head
  const hj = joints[BONES.indexOf('head')]
  const local = (p: V3): V3 => [p[0] - hj[0], p[1] - hj[1], p[2] - hj[2]]
  const owned: { obj: Object3D; geo: BufferGeometry[]; mat?: MeshPhysicalMaterial }[] = []
  const props: Object3D[] = []
  const isDrawn = shape.eyes.some((e) => e.open !== undefined)
  const materials = isDrawn ? drawnMaterials(toon) : personMaterials(skin)
  const eyes: Object3D[] = []
  const lids: Object3D[] = []
  for (const e of shape.eyes) {
    const pivot = new Object3D()
    pivot.position.set(...local(e.center))
    // A drawn eye is turned to lie along the face. It looks about from there.
    pivot.rotation.y = e.yaw ?? 0
    pivot.userData.yaw = e.yaw ?? 0
    const eyeGeo = e.open
      ? drawnEyeGeometry(e.radius, e.open, eyeColor)
      : eyeGeometry(e.radius, eyeColor, 40)
    pivot.add(new Mesh(eyeGeo, materials.eye))
    head.add(pivot)
    eyes.push(pivot)
    const lidPivot = new Object3D()
    lidPivot.position.set(...local(e.center))
    lidPivot.rotation.order = 'YXZ'
    lidPivot.rotation.y = e.yaw ?? 0
    const lidGeo = e.open
      ? drawnLidGeometry(shape.lidRadius, skinColor)
      : lidGeometry(shape.lidRadius, skinColor)
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
