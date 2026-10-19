import { groundForward, MOVE_KEYS } from '@runek/core'
import { Vector3 } from 'three'
import { locate, round } from '../state/ops'
import { patchNode, useWorkshop } from '../state/store'
import { live, nodeObjects } from './refs'

type WorkshopState = ReturnType<typeof useWorkshop.getState>

const FIXED = ['Sky', 'LightRig']

/** The node WASD moves instead of the camera: the selection, when it can be moved. */
export function nudgeTarget(s: WorkshopState): string | null {
  const id = s.selection
  if (!id || s.playing || (s.mode !== 'build' && s.mode !== 'code')) return null
  if (s.locked[id] || s.hidden[id]) return null
  const found = locate(s.world.nodes, id)
  if (!found || FIXED.includes(found.node.type)) return null
  return nodeObjects.has(id) ? id : null
}

const forward = new Vector3()
const right = new Vector3()
const up = new Vector3(0, 1, 0)
const at = new Vector3()

/** The world axis (±X or ±Z) closest to `v` on the ground. */
const snapToAxis = (v: Vector3) =>
  Math.abs(v.x) > Math.abs(v.z) ? v.set(Math.sign(v.x), 0, 0) : v.set(0, 0, Math.sign(v.z) || 1)

/** Steps the selection one notch along the world axis nearest the camera's forward / right. */
export function nudgeSelected(code: string, coarse: boolean) {
  const s = useWorkshop.getState()
  const id = nudgeTarget(s)
  const dir = MOVE_KEYS[code]
  const object = id ? nodeObjects.get(id) : undefined
  if (!id || !dir || !object) return
  const found = locate(s.world.nodes, id)
  if (!found) return

  const camera = live.three?.camera
  if (camera) groundForward(camera, forward)
  else forward.set(0, 0, -1)
  snapToAxis(forward)
  right.crossVectors(forward, up)

  const step = (s.view.snap ? s.view.snapStep : 0.1) * (coarse ? 10 : 1)
  object.getWorldPosition(at)
  at.addScaledVector(forward, dir[2] * step)
    .addScaledVector(right, dir[0] * step)
    .addScaledVector(up, dir[1] * step)
  const local = object.parent ? object.parent.worldToLocal(at) : at

  const authored = found.node.props?.position
  const offset = Array.isArray(authored) ? Number(authored[1]) || 0 : 0
  // Anchored nodes ride the ground; their y is an offset above it.
  const y = found.node.anchor ? offset + dir[1] * step : local.y
  patchNode(id, { position: [round(local.x), round(y), round(local.z)] }, `nudge:${id}`)
}
