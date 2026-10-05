import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { type ComponentRef, useEffect, useRef } from 'react'
import { Box3, type PerspectiveCamera, Sphere, Vector3 } from 'three'
import type { CameraState } from '../share/codec'
import { useWorkshop } from '../state/store'
import { live, nodeObjects } from './refs'

const box = new Box3()
const sphere = new Sphere()

interface Flight {
  from: { position: Vector3; target: Vector3 }
  to: { position: Vector3; target: Vector3 }
  start: number
}

const DURATION = 0.45

/** Orbit camera + the workshop's camera requests (frame, presets, restore). Publishes where
 *  it looks as the focus point new nodes land on. */
export function CameraRig({
  initial,
  scope = 'world',
}: {
  initial?: CameraState | null
  scope?: string
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const scene = useThree((s) => s.scene)
  const request = useWorkshop((s) => s.camera)
  const flight = useRef<Flight | null>(null)
  const handled = useRef(request?.n ?? 0)

  useEffect(() => {
    const c = controls.current
    if (!c) return
    const state = initial ?? live.camera
    if (state) {
      camera.position.set(...state.position)
      c.target.set(...state.target)
    } else {
      camera.position.set(8.5, 6.5, 10)
      c.target.set(0, 0.8, 0)
    }
    c.update()
    publish()
  }, [])

  const publish = () => {
    const c = controls.current
    if (!c) return
    const position = camera.position.toArray().map(round) as CameraState['position']
    const target = c.target.toArray().map(round) as CameraState['target']
    live.camera = { position, target }
    const focus = useWorkshop.getState().focusPoint
    if (focus[0] !== target[0] || focus[2] !== target[2]) {
      useWorkshop.setState({ focusPoint: [target[0], 0, target[2]] })
    }
  }

  const fly = (position: Vector3, target: Vector3) => {
    const c = controls.current
    if (!c) return
    flight.current = {
      from: { position: camera.position.clone(), target: c.target.clone() },
      to: { position, target },
      start: performance.now() / 1000,
    }
  }

  const fit = (object: { traverse: unknown } | null, aspect = camera.aspect) => {
    const c = controls.current
    if (!c || !object) return
    box.setFromObject(object as Parameters<Box3['setFromObject']>[0])
    if (box.isEmpty()) return
    box.getBoundingSphere(sphere)
    const radius = Math.max(sphere.radius, 0.5)
    const vFov = (camera.fov * Math.PI) / 180
    const fov = Math.min(vFov, 2 * Math.atan(Math.tan(vFov / 2) * aspect))
    const distance = (radius / Math.sin(fov / 2)) * 1.15
    const dir = camera.position.clone().sub(c.target).normalize()
    if (dir.lengthSq() < 0.5) dir.set(0.6, 0.5, 0.6).normalize()
    fly(sphere.center.clone().add(dir.multiplyScalar(distance)), sphere.center.clone())
  }

  useEffect(() => {
    if (!request || request.n === handled.current) return
    handled.current = request.n
    const c = controls.current
    if (!c) return
    if (request.kind === 'frame') fit(nodeObjects.get(request.id) ?? null, request.aspect)
    else if (request.kind === 'all') fit(scene.getObjectByName(scope) ?? null)
    else if (request.kind === 'restore') {
      fly(new Vector3(...request.camera.position), new Vector3(...request.camera.target))
    } else {
      const target = c.target.clone()
      const d = Math.max(camera.position.distanceTo(target), 6)
      const offset = {
        perspective: new Vector3(0.62, 0.48, 0.62),
        top: new Vector3(0, 1, 0.0001),
        front: new Vector3(0, 0.12, 1),
        side: new Vector3(1, 0.12, 0),
      }[request.preset]
      fly(target.clone().add(offset.normalize().multiplyScalar(d)), target)
    }
  }, [request])

  useFrame(() => {
    const f = flight.current
    const c = controls.current
    if (!f || !c) return
    const t = Math.min(1, (performance.now() / 1000 - f.start) / DURATION)
    const k = 1 - (1 - t) ** 3
    camera.position.lerpVectors(f.from.position, f.to.position, k)
    c.target.lerpVectors(f.from.target, f.to.target, k)
    c.update()
    if (t >= 1) {
      flight.current = null
      publish()
    }
  })

  return (
    <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.12} onEnd={publish} />
  )
}

const round = (n: number) => Math.round(n * 100) / 100
