import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { type Camera, Spherical, Vector3 } from 'three'
import { isEditableTarget } from './input'

/** WASD along the ground, Q/E down and up, as [right, up, forward]. */
export const MOVE_KEYS: Record<string, [number, number, number]> = {
  KeyW: [0, 0, 1],
  KeyS: [0, 0, -1],
  KeyD: [1, 0, 0],
  KeyA: [-1, 0, 0],
  KeyE: [0, 1, 0],
  KeyQ: [0, -1, 0],
}

/** Arrow keys orbit the view, as [yaw, pitch]: left turns left, up looks up. */
const TURN_KEYS: Record<string, [number, number]> = {
  ArrowLeft: [1, 0],
  ArrowRight: [-1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
}

/** Radians per second the arrow keys orbit the view. */
const TURN_SPEED = 1.6

/** The orbit-controls surface the keys drive (drei's `OrbitControls` with `makeDefault`). */
interface OrbitLike {
  target: Vector3
  minPolarAngle: number
  maxPolarAngle: number
  update: () => void
}

export interface OrbitKeysOptions {
  /** Return true to leave a key alone (e.g. WASD nudging a selection instead). */
  skip?: (code: string) => boolean
  /** Called when the first key goes down. */
  onStart?: () => void
  /** Called once every key is released, with the camera at rest. */
  onEnd?: () => void
}

const forward = new Vector3()
const right = new Vector3()
const pan = new Vector3()
const offset = new Vector3()
const orbit = new Spherical()
const UP = new Vector3(0, 1, 0)

/** The ground direction the camera faces; looking straight down, the top of the screen. */
export function groundForward(camera: Camera, out: Vector3): Vector3 {
  camera.getWorldDirection(out)
  out.y = 0
  if (out.lengthSq() < 1e-6) out.set(0, 1, 0).applyQuaternion(camera.quaternion)
  out.y = 0
  return out.normalize()
}

/**
 * Keyboard flight for an orbit camera: hold W A S D to pan across the ground, Q / E to go down
 * and up, and the arrow keys to orbit the target. Shift goes faster. Drives the scene's default
 * controls, so mount it inside a `<Canvas>` beside `<OrbitControls makeDefault />`.
 */
export function useOrbitKeys({ skip, onStart, onEnd }: OrbitKeysOptions = {}) {
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null
  const camera = useThree((s) => s.camera)
  const held = useRef(new Set<string>())
  const fast = useRef(false)
  const handlers = useRef({ skip, onStart, onEnd })
  handlers.current = { skip, onStart, onEnd }

  useEffect(() => {
    const keys = held.current
    const onDown = (e: KeyboardEvent) => {
      fast.current = e.shiftKey
      if (!(e.code in MOVE_KEYS) && !(e.code in TURN_KEYS)) return
      if (e.metaKey || e.ctrlKey || e.altKey || isEditableTarget(e.target)) return
      if (handlers.current.skip?.(e.code)) return
      if (e.code in TURN_KEYS) e.preventDefault()
      if (!keys.size) handlers.current.onStart?.()
      keys.add(e.code)
    }
    const onUp = (e: KeyboardEvent) => {
      fast.current = e.shiftKey
      if (keys.delete(e.code) && !keys.size) handlers.current.onEnd?.()
    }
    const release = () => {
      if (!keys.size) return
      keys.clear()
      handlers.current.onEnd?.()
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', release)
      keys.clear()
    }
  }, [])

  useFrame((_, delta) => {
    const keys = held.current
    if (!keys.size || !controls?.target) return
    const dt = Math.min(delta, 0.1)
    let x = 0
    let y = 0
    let z = 0
    let yaw = 0
    let pitch = 0
    for (const code of keys) {
      const move = MOVE_KEYS[code]
      if (move) {
        x += move[0]
        y += move[1]
        z += move[2]
      }
      const turn = TURN_KEYS[code]
      if (turn) {
        yaw += turn[0]
        pitch += turn[1]
      }
    }

    if (x || y || z) {
      groundForward(camera, forward)
      right.crossVectors(forward, UP)
      const distance = camera.position.distanceTo(controls.target)
      const speed = Math.min(Math.max(distance * 0.8, 2), 30) * (fast.current ? 3 : 1) * dt
      pan
        .set(0, 0, 0)
        .addScaledVector(forward, z)
        .addScaledVector(right, x)
        .addScaledVector(UP, y)
        .normalize()
        .multiplyScalar(speed)
      camera.position.add(pan)
      controls.target.add(pan)
    }

    if (yaw || pitch) {
      const k = TURN_SPEED * (fast.current ? 2 : 1) * dt
      offset.subVectors(camera.position, controls.target)
      orbit.setFromVector3(offset)
      orbit.theta += yaw * k
      orbit.phi = Math.min(
        Math.max(orbit.phi + pitch * k, Math.max(controls.minPolarAngle, 0.05)),
        Math.min(controls.maxPolarAngle, Math.PI - 0.05),
      )
      camera.position.copy(controls.target).add(offset.setFromSpherical(orbit))
    }
    controls.update()
  })
}
