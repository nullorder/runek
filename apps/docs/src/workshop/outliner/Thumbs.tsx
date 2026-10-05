import { createPortal, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  ACESFilmicToneMapping,
  Box3,
  Mesh,
  PerspectiveCamera,
  Scene,
  Sphere,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'
import { create } from 'zustand'
import { PREVIEW } from '../../lib/preview'
import { Subject } from '../lab/Subject'
import { useWorkshop } from '../state/store'

const KEY = 'runek-workshop:thumbs:v1'
/** Screen overlays and world-sized backdrops make poor thumbnails. */
const NO_THUMB = new Set(['Compass', 'Sky', 'Ocean', 'Clouds', 'Birds'])
const SIZE = 120

const load = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

const useThumbs = create<{
  urls: Record<string, string>
  wanted: string[]
  failed: Record<string, true>
}>(() => ({
  urls: typeof window === 'undefined' ? {} : load(),
  wanted: [],
  failed: {},
}))

const want = (type: string) =>
  useThumbs.setState(({ wanted, urls, failed }) =>
    urls[type] || failed[type] || wanted.includes(type) ? {} : { wanted: [...wanted, type] },
  )

function done(type: string, url: string | null) {
  useThumbs.setState(({ urls, wanted, failed }) => {
    const next = url ? { ...urls, [type]: url } : urls
    if (url) {
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {}
    }
    return {
      urls: next,
      wanted: wanted.filter((w) => w !== type),
      failed: url ? failed : { ...failed, [type]: true },
    }
  })
}

/** A small cached render of a component for the catalog; requests one when missing. */
export function Thumb({ type }: { type: string }) {
  const url = useThumbs((s) => s.urls[type])
  useEffect(() => {
    if (!url && !PREVIEW[type]?.skip && !NO_THUMB.has(type)) want(type)
  }, [url, type])
  return url ? (
    <img className="ws-thumb" src={url} alt="" />
  ) : (
    <span className="ws-thumb ws-thumb--empty">{type.slice(0, 2)}</span>
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

/** Lives inside a canvas: bakes requested thumbnails one at a time, in the background. */
export function ThumbnailBaker() {
  const current = useThumbs((s) => s.wanted[0])
  const busy = useWorkshop((s) => s.playing || s.sandbox.running)
  if (!current || busy) return null
  return <Bake key={current} type={current} />
}

const box = new Box3()
const sphere = new Sphere()

function Bake({ type }: { type: string }) {
  const scene = useMemo(() => new Scene(), [])
  const frames = useRef(0)
  const stable = useRef(0)
  const last = useRef('')
  const props = useMemo(
    () => ({ seed: 3, ...(PREVIEW[type]?.props as Record<string, never>) }),
    [type],
  )

  useFrame(() => {
    frames.current++
    let meshes = 0
    scene.traverse((o) => {
      if (o instanceof Mesh) meshes++
    })
    box.setFromObject(scene)
    const sig = `${meshes}:${box.min.toArray().map((n) => n.toFixed(2))}:${box.max.toArray().map((n) => n.toFixed(2))}`
    stable.current = meshes > 0 && sig === last.current ? stable.current + 1 : 0
    last.current = sig
    if (stable.current < 6 && frames.current < 300) return
    if (box.isEmpty() || !Number.isFinite(box.min.x)) return done(type, null)
    box.getBoundingSphere(sphere)
    const camera = new PerspectiveCamera(32, 1, 0.01, 2000)
    const dir = new Vector3(1, 0.7, 1.25).normalize()
    const distance = (sphere.radius / Math.sin((32 * Math.PI) / 360)) * 1.02
    camera.position.copy(sphere.center).add(dir.multiplyScalar(distance))
    camera.lookAt(sphere.center)
    camera.far = distance * 4
    camera.updateProjectionMatrix()
    try {
      const gl = getRenderer()
      gl.setClearColor(0x000000, 0)
      gl.render(scene, camera)
      done(type, gl.domElement.toDataURL('image/webp', 0.85))
    } catch {
      done(type, null)
    }
  })

  return createPortal(
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 9, 6]} intensity={1.8} />
      <directionalLight position={[-6, 3, -4]} intensity={0.5} />
      <Subject type={type} props={props} />
    </>,
    scene,
  )
}
