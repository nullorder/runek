import { useCallback, useMemo } from 'react'
import { type Camera, type Object3D, type Vector2, Vector3 } from 'three'
import { useWorld } from './useWorld'

/**
 * A curved projection drawn in place of the world camera's flat one (a `Player`'s wide
 * first-person view). Whatever maps between the screen and the scene reads it, so clicks and
 * screen-pinned labels land where the lens actually shows things.
 */
export interface Lens {
  /** Write a camera-space point's normalized device coordinates (-1 to 1 each way) into its x
   *  and y, or return null when the lens can't show it. */
  project(point: Vector3): Vector3 | null
  /** The camera-space direction seen at normalized device coordinates `ndc`, written into
   *  `target` (unit length). */
  unproject(ndc: Vector2, target: Vector3): Vector3
}

/**
 * A drei `<Html calculatePosition>` that follows the world's lens, so a label pinned to a
 * thing stays on it through a curved first-person view. Projects through the camera as drei
 * does when no lens is set.
 */
export function useLensPosition() {
  const { lens } = useWorld()
  const at = useMemo(() => new Vector3(), [])
  return useCallback(
    (el: Object3D, camera: Camera, size: { width: number; height: number }) => {
      at.setFromMatrixPosition(el.matrixWorld)
      const active = lens?.current
      if (active) {
        // Off the lens: park it far outside the canvas.
        if (!active.project(at.applyMatrix4(camera.matrixWorldInverse))) return [-1e5, -1e5]
      } else {
        at.project(camera)
      }
      return [((at.x + 1) * size.width) / 2, ((1 - at.y) * size.height) / 2]
    },
    [lens, at],
  )
}
