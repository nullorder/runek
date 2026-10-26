import { createContext, type RefObject, useContext, useEffect, useMemo, useRef } from 'react'
import {
  type Camera,
  Color,
  type ColorRepresentation,
  Frustum,
  Group,
  Matrix4,
  type Object3D,
  PointLight,
  Sphere,
  SpotLight,
  Vector3,
} from 'three'

export type LightKind = 'point' | 'spot'

/** How a light shines: what a lamp asks the world's light pool for. */
export interface LightLook {
  /** `point` (all around, the default) or `spot` (a cone toward the emitter's `target`). */
  kind?: LightKind
  color?: ColorRepresentation
  intensity?: number
  /** Reach in world units; 0 means unlimited (three's convention). */
  distance?: number
  decay?: number
  /** Spot only: cone half-angle in radians. */
  angle?: number
  /** Spot only: how soft the cone's edge is, 0 to 1. */
  penumbra?: number
}

/**
 * A light source a component registers with the world. It isn't a light itself: the world keeps
 * a fixed pool of real lights (`<World lightBudget>`) and lends them each frame to the emitters
 * that matter most to the view, so a world full of lamps lights like it has a handful.
 */
export interface LightEmitter {
  /** Put on the object the light shines from. */
  readonly ref: RefObject<Object3D | null>
  /** Spot only: put on the object the cone aims at. */
  readonly target: RefObject<Object3D | null>
  kind: LightKind
  color: Color
  /** Brightness right now. Write it every frame for a flicker; the pool reads it as it draws. */
  intensity: number
  distance: number
  decay: number
  angle: number
  penumbra: number
  /** False takes it out of the running (a lamp that's off). */
  enabled: boolean
}

/** Where emitters register: provided by `<World>` (and anything else that runs a `LightPool`). */
export const LightPoolContext = createContext<Set<LightEmitter> | null>(null)

/** Seconds a pooled light takes to fade in or out when it moves to another emitter. */
const FADE = 0.3
/** How much a lit emitter's score is boosted to keep it, so near-ties don't flicker between two. */
const KEEP = 2
/** Seconds an emitter keeps a light it was just given, whatever the scores say. */
const HOLD = 1
/** Score kept by an emitter whose reach only brushes the view, and by one whose reach is wholly
 *  outside it (it may still light what you see). */
const EDGE_OF_VIEW = 0.5
const OFF_VIEW = 0.15
/** Reach assumed for an unlimited light, in world units, when scoring. */
const OPEN_REACH = 20

let warned = false

/**
 * Register a light source with the world's light pool for as long as the component is mounted.
 * Returns the emitter: attach `ref` to the object the light shines from (and `target` to what a
 * spot aims at), and write `intensity` each frame to make it flicker. `enabled: false` (a lamp
 * that's off) keeps it registered but unlit.
 *
 * ```tsx
 * const glow = useLight({ color: '#ffd9a0', intensity: 2, distance: 8 })
 * <object3D ref={glow.ref} position={[0, 1.4, 0]} />
 * ```
 */
export function useLight(look: LightLook, enabled = true): LightEmitter {
  const pool = useContext(LightPoolContext)
  const ref = useRef<Object3D | null>(null)
  const target = useRef<Object3D | null>(null)
  const emitter = useMemo<LightEmitter>(
    () => ({
      ref,
      target,
      kind: 'point',
      color: new Color(),
      intensity: 1,
      distance: 0,
      decay: 2,
      angle: Math.PI / 3,
      penumbra: 0,
      enabled: true,
    }),
    [],
  )
  emitter.kind = look.kind ?? 'point'
  emitter.color.set(look.color ?? '#ffffff')
  emitter.distance = look.distance ?? 0
  emitter.decay = look.decay ?? 2
  emitter.angle = look.angle ?? Math.PI / 3
  emitter.penumbra = look.penumbra ?? 0
  emitter.enabled = enabled
  // Only reset brightness when the look's own value changes, so a flicker isn't stomped by a
  // re-render.
  const base = look.intensity ?? 1
  useEffect(() => {
    emitter.intensity = base
  }, [emitter, base])

  useEffect(() => {
    if (!pool) {
      if (!warned && typeof console !== 'undefined') {
        warned = true
        console.warn('useLight: no light pool here (render inside <World> or a <LightPool>).')
      }
      return
    }
    pool.add(emitter)
    return () => {
      pool.delete(emitter)
    }
  }, [pool, emitter])
  return emitter
}

interface Slot<L extends PointLight | SpotLight> {
  light: L
  emitter: LightEmitter | null
  /** 0 to 1: how far faded in. */
  weight: number
  /** Seconds since it was given its emitter. */
  held: number
}

const at = new Vector3()
const aim = new Vector3()
const sphere = new Sphere()
const frustum = new Frustum()
const viewProjection = new Matrix4()

/**
 * A fixed set of real three.js lights (some point, some spot) lent each frame to the emitters
 * that matter most: brightest and nearest first, those whose reach touches the view ahead of
 * those behind you, fading over a moment when one hands off to another. The number of lights
 * never changes, so materials never recompile as lamps come and go.
 */
export class LightPool {
  readonly root = new Group()
  private readonly points: Slot<PointLight>[]
  private readonly spots: Slot<SpotLight>[]

  constructor(
    readonly emitters: Set<LightEmitter>,
    budget: { point: number; spot: number },
  ) {
    this.root.name = 'runek:lights'
    // Reachable from the scene, for tooling (`just perf`, debugging) to read `lit`.
    this.root.userData.pool = this
    this.points = Array.from({ length: budget.point }, () => this.slot(new PointLight()))
    this.spots = Array.from({ length: budget.spot }, () => {
      const slot = this.slot(new SpotLight())
      this.root.add(slot.light.target)
      return slot
    })
  }

  private slot<L extends PointLight | SpotLight>(light: L): Slot<L> {
    light.intensity = 0
    light.castShadow = false
    this.root.add(light)
    return { light, emitter: null, weight: 0, held: 0 }
  }

  /** Which emitters hold a light right now (for tests and tooling). */
  get lit(): LightEmitter[] {
    return [...this.points, ...this.spots].flatMap((s) => (s.emitter ? [s.emitter] : []))
  }

  update(camera: Camera, dt: number) {
    camera.updateMatrixWorld()
    viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    frustum.setFromProjectionMatrix(viewProjection)
    const eye = camera.getWorldPosition(new Vector3())
    this.assign(this.points, 'point', eye, dt)
    this.assign(this.spots, 'spot', eye, dt)
  }

  private assign<L extends PointLight | SpotLight>(
    slots: Slot<L>[],
    kind: LightKind,
    eye: Vector3,
    dt: number,
  ) {
    if (slots.length === 0) return
    const held = new Set(slots.map((s) => s.emitter))
    const ranked: [LightEmitter, number][] = []
    for (const e of this.emitters) {
      if (e.kind !== kind || !e.enabled || e.intensity <= 0 || !e.ref.current) continue
      e.ref.current.getWorldPosition(at)
      const reach = e.distance > 0 ? e.distance : OPEN_REACH
      // Roughly how bright the light is over what it reaches, as seen from the eye: a dim light
      // you stand next to beats a bright one across the hall.
      let score = e.intensity / Math.max(reach, at.distanceTo(eye)) ** 2
      sphere.set(at, reach)
      if (!frustum.containsPoint(at)) {
        score *= frustum.intersectsSphere(sphere) ? EDGE_OF_VIEW : OFF_VIEW
      }
      if (held.has(e)) score *= KEEP
      ranked.push([e, score])
    }
    ranked.sort((a, b) => b[1] - a[1])
    // A light handed over a moment ago stays put, so close calls can't make it flicker.
    const wanted = new Set(slots.flatMap((s) => (s.emitter && s.held < HOLD ? [s.emitter] : [])))
    for (const [e] of ranked) {
      if (wanted.size >= slots.length) break
      wanted.add(e)
    }

    const step = dt / FADE
    for (const slot of slots) {
      if (slot.emitter && !wanted.has(slot.emitter)) {
        slot.weight -= step
        if (slot.weight <= 0) {
          slot.weight = 0
          slot.emitter = null
        }
      }
    }
    const placed = new Set(slots.map((s) => s.emitter))
    for (const e of wanted) {
      if (placed.has(e)) continue
      const free = slots.find((s) => !s.emitter)
      if (!free) break
      free.emitter = e
      free.weight = 0
      free.held = 0
    }

    for (const slot of slots) {
      const e = slot.emitter
      const light = slot.light
      if (!e?.ref.current) {
        light.intensity = 0
        continue
      }
      slot.held += dt
      if (wanted.has(e)) slot.weight = Math.min(1, slot.weight + step)
      e.ref.current.getWorldPosition(light.position)
      light.color.copy(e.color)
      light.intensity = e.intensity * smooth(slot.weight)
      light.distance = e.distance
      light.decay = e.decay
      if ((light as SpotLight).isSpotLight) {
        const spot = light as unknown as SpotLight
        spot.angle = e.angle
        spot.penumbra = e.penumbra
        if (e.target.current) e.target.current.getWorldPosition(aim)
        else aim.copy(light.position).y -= 1
        spot.target.position.copy(aim)
        spot.target.updateMatrixWorld()
      }
    }
  }

  dispose() {
    for (const s of [...this.points, ...this.spots]) s.light.dispose()
    this.root.clear()
  }
}

const smooth = (t: number) => t * t * (3 - 2 * t)
