import { createPortal, useFrame } from '@react-three/fiber'
import { Person } from '@runek/components'
import type { JsonValue } from '@runek/core'
import { useEffect, useMemo, useRef } from 'react'
import {
  ACESFilmicToneMapping,
  Box3,
  type Object3D,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'
import { create } from 'zustand'
import { useWorkshop } from '../state/store'

const KEY = 'runek-workshop:dress-tiles:v1'
const SIZE = 112

/** `head` crops to the face and hair, `body` frames the whole figure. */
export type Crop = 'head' | 'body'

export interface TileJob {
  id: string
  props: Record<string, JsonValue>
  crop: Crop
}

/** The figure every tile shows, so tiles differ only in the trait they stand for. */
export const TILE_BASE: Record<string, JsonValue> = {
  seed: 5,
  gender: 'neutral',
  skinTone: '#e0aa7e',
  hairColor: '#4a3122',
  facialHair: 'none',
  outfit: 'tshirt',
  topColor: '#5b7fa3',
  bottomColor: '#3a3f47',
  hat: 'none',
  accessories: [],
}

const load = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

const useTiles = create<{ urls: Record<string, string>; queue: TileJob[] }>(() => ({
  urls: typeof window === 'undefined' ? {} : load(),
  queue: [],
}))

const want = (job: TileJob) =>
  useTiles.setState(({ urls, queue }) =>
    urls[job.id] || queue.some((q) => q.id === job.id) ? {} : { queue: [...queue, job] },
  )

function done(id: string, url: string | null) {
  useTiles.setState(({ urls, queue }) => {
    const next = url ? { ...urls, [id]: url } : urls
    if (url) {
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {}
    }
    return { urls: next, queue: queue.filter((q) => q.id !== id) }
  })
}

/** A cached render of the tile figure wearing `props`; queued for baking when missing. */
export function TileImage({ job, fallback }: { job: TileJob; fallback: string }) {
  const url = useTiles((s) => s.urls[job.id])
  useEffect(() => {
    if (!url) want(job)
  }, [url, job.id])
  return url ? (
    <img className="ws-tile__img" src={url} alt="" />
  ) : (
    <span className="ws-tile__img is-empty">{fallback}</span>
  )
}

let renderer: WebGLRenderer | null = null
const getRenderer = () => {
  if (!renderer) {
    renderer = new WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(SIZE, SIZE, false)
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.outputColorSpace = SRGBColorSpace
  }
  return renderer
}

/** Lives inside the dressing room's canvas: bakes queued tiles one at a time. */
export function TileBaker() {
  const job = useTiles((s) => s.queue[0])
  const busy = useWorkshop((s) => s.playing)
  if (!job || busy) return null
  return <Bake key={job.id} job={job} />
}

const box = new Box3()
const center = new Vector3()

const skinned = (root: Object3D) => {
  let found = false
  root.traverse((o) => {
    if ((o as { isSkinnedMesh?: boolean }).isSkinnedMesh) found = true
  })
  return found
}

function Bake({ job }: { job: TileJob }) {
  const scene = useMemo(() => new Scene(), [])
  const frames = useRef(0)
  const stable = useRef(0)
  const last = useRef('')

  useFrame(() => {
    frames.current++
    const ready = skinned(scene)
    box.setFromObject(scene)
    const sig = `${ready}:${box.min.y.toFixed(3)}:${box.max.y.toFixed(3)}`
    stable.current = ready && sig === last.current ? stable.current + 1 : 0
    last.current = sig
    if (stable.current < 4 && frames.current < 400) return
    if (!ready || box.isEmpty()) return done(job.id, null)
    const height = box.max.y - box.min.y
    box.getCenter(center)
    const camera = new PerspectiveCamera(30, 1, 0.01, 100)
    let span: number
    if (job.crop === 'head') {
      center.y = box.max.y - height * 0.1
      span = height * 0.26
    } else {
      span = height * 1.1
    }
    const distance = span / 2 / Math.tan((15 * Math.PI) / 180)
    camera.position
      .copy(center)
      .add(new Vector3(0.38, 0.12, 1).normalize().multiplyScalar(distance))
    camera.lookAt(center)
    camera.updateProjectionMatrix()
    try {
      const gl = getRenderer()
      gl.setClearColor(0x000000, 0)
      gl.render(scene, camera)
      done(job.id, gl.domElement.toDataURL('image/webp', 0.85))
    } catch {
      done(job.id, null)
    }
  })

  return createPortal(
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 6, 6]} intensity={1.9} />
      <directionalLight position={[-4, 3, -3]} intensity={0.6} />
      <Person
        {...(job.props as Record<string, never>)}
        physics={false}
        lookAt={false}
        idle={false}
        detail="low"
      />
    </>,
    scene,
  )
}
