import { KeyboardControls, type KeyboardControlsEntry, PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics, useRapier } from '@react-three/rapier'
import { type ReactNode, useMemo, useRef, useState } from 'react'
import type { Object3D } from 'three'
import { WorldContext } from './context'
import { DEFAULT_FONTS, type WorldFonts } from './font'
import { useKeySource } from './input'
import { controlsToMap, resolveControls, type WorldControls } from './keyboard'
import { LightBudget } from './LightBudget'
import type { Lens } from './lens'
import { DEFAULT_PALETTE, type WorldPalette } from './palette'
import { ShadowRate } from './ShadowRate'
import { StaticBatching } from './StaticBatching'
import { resolveWorldTime } from './time'
import type { AvatarView, Interactor, Vec3, Walker, WorldFog } from './types'

export interface WorldProps {
  unit?: number
  gravity?: Vec3
  /** Baseline ground level (Y). Floor-sitting and water components default to it;
   *  an explicit `position` still wins. Default 0. */
  ground?: number
  /** Remap input bindings: a partial action → `KeyboardEvent.code[]` map merged
   *  over the defaults (serializable — travels in world files as `controls`).
   *  Unknown action names become custom bindings components can read. */
  controls?: WorldControls
  /** Low-level escape hatch: a complete drei keyboard map, passed verbatim.
   *  Wins over `controls` when given. Prefer `controls`, which serializes. */
  keyboardMap?: KeyboardControlsEntry[]
  /** Read the keyboard. Keys aimed at a text field or other editable element are always
   *  left to the page; set false to ignore the keyboard entirely (e.g. while a modal is
   *  open). Pointer look listens on the canvas only, so it already yields to overlays. */
  input?: boolean
  /** Stop the frame loop and physics: no rendering, no steps, no input. Animation clocks
   *  carry on from where they stopped, and anything driven by the wall clock (walking
   *  `Person`s) is simply where it should be on resume. */
  paused?: boolean
  /** Render the default light rig. Set false to supply your own (e.g. <LightRig>). */
  lights?: boolean
  /** Override color slots; unset slots keep their defaults. Components read these via `useWorld()`. */
  palette?: Partial<WorldPalette>
  /** Fonts the world ships, by role (`display`, `body`). Text components draw from
   *  these; unset roles fall back to the bundled default. Values are font URLs. */
  fonts?: Partial<WorldFonts>
  /** Linear distance fog. Pair the color with your sky's horizon. */
  fog?: WorldFog
  /** Pin a fixed time-of-day ("HH:MM", 24h) so the world is reproducible. Drives
   *  day/night-aware components. A `timezone` instead makes it track a live clock. */
  time?: string
  /** IANA timezone (e.g. "Asia/Kolkata") for a live, clock-driven day/night. Ignored
   *  when `time` is set (a pin wins); used as the live source otherwise. */
  timezone?: string
  /** World default camera view. `Player` reads it when its own `view` is unset. */
  avatar?: AvatarView
  /** Fired when a pointer click misses every object (used to deselect in the editor). */
  onPointerMissed?: () => void
  /** Keep the WebGL backbuffer so the canvas can be snapshotted via `toDataURL`
   *  (the editor enables this for the "suggest changes" PNG). Off by default — it can
   *  cost a little performance. */
  preserveDrawingBuffer?: boolean
  /** Pixel ratio to render at. A number pins it. A `[min, max]` range follows the display's own
   *  ratio up to `max`, and steps down toward `min` while frames run slow (back up when they
   *  recover). Default `[1, 1.5]`: sharp on a high-density screen at about half the cost of 2x. */
  dpr?: number | [number, number]
  /** Merge static parts that share a material into one mesh per material per cell, so draw
   *  calls follow the number of looks, not the number of parts. Moving parts, interactive ones
   *  and anything under `<Dynamic>` stay as they are. `true` uses 20 m cells; pass `{ cell }` to
   *  size them; `false` turns it off. Default `true`. */
  batching?: boolean | { cell?: number }
  /** Real lights the world lends to its lamps (`useLight` emitters): a number of point lights,
   *  or `{ point, spot }`. Each frame they go to the emitters that matter most to the view,
   *  fading as they hand off; the count never changes, so nothing recompiles. Default 6 point
   *  lights and 2 spotlights. */
  lightBudget?: number | { point?: number; spot?: number }
  /** How many times a second shadow maps are redrawn. Redrawing walks the whole scene for the
   *  light, so a big world saves a millisecond or two by not doing it every frame; moving
   *  shadows still read as smooth at the default 30. `Infinity` redraws every frame. */
  shadowRate?: number
  debug?: boolean
  children?: ReactNode
}

export function World({
  unit = 1,
  gravity = [0, -9.81, 0],
  ground = 0,
  controls,
  keyboardMap,
  input = true,
  paused = false,
  lights = true,
  palette,
  fonts,
  fog,
  time,
  timezone,
  avatar,
  onPointerMissed,
  preserveDrawingBuffer = false,
  dpr = DEFAULT_DPR,
  batching = true,
  lightBudget = DEFAULT_LIGHT_BUDGET,
  shadowRate = 30,
  debug = false,
  children,
}: WorldProps) {
  // An explicit keyboardMap wins verbatim; otherwise the world's partial
  // `controls` merge over the defaults. The context always reflects the
  // bindings actually in effect, so components can read/display them.
  const resolvedControls = useMemo(
    () =>
      keyboardMap
        ? Object.fromEntries(keyboardMap.map((entry) => [entry.name, entry.keys]))
        : resolveControls(controls),
    [keyboardMap, controls],
  )
  const inputMap = useMemo(
    () => keyboardMap ?? controlsToMap(resolvedControls),
    [keyboardMap, resolvedControls],
  )

  const keySource = useKeySource(input && !paused)

  const player = useRef<Object3D | null>(null)
  const lens = useRef<Lens | null>(null)
  const walkers = useMemo(() => new Set<Walker>(), [])
  const interactions = useMemo(() => new Set<Interactor>(), [])

  const context = useMemo(
    () => ({
      unit,
      gravity,
      ground,
      palette: { ...DEFAULT_PALETTE, ...palette },
      fonts: { ...DEFAULT_FONTS, ...fonts },
      time: resolveWorldTime({ time, timezone }),
      avatar,
      controls: resolvedControls,
      player,
      lens,
      walkers,
      interactions,
      keyboard: keySource,
    }),
    [
      unit,
      gravity,
      ground,
      palette,
      fonts,
      time,
      timezone,
      avatar,
      resolvedControls,
      walkers,
      interactions,
      keySource,
    ],
  )

  const [minDpr, maxDpr] = typeof dpr === 'number' ? [dpr, dpr] : dpr
  const [dprCeiling, setDprCeiling] = useState(maxDpr)
  const ceiling = Math.min(Math.max(dprCeiling, minDpr), maxDpr)

  return (
    // drei types `domElement` as an element but only listens on it, so any EventTarget works.
    <KeyboardControls map={inputMap} domElement={keySource as HTMLElement}>
      <Canvas
        frameloop={paused ? 'never' : 'always'}
        shadows
        dpr={[minDpr, ceiling]}
        camera={{ position: [6, 4, 6], fov: 60 }}
        gl={{ preserveDrawingBuffer }}
        onPointerMissed={onPointerMissed}
      >
        <WorldContext.Provider value={context}>
          <KeepClock />
          <ShadowRate rate={shadowRate} />
          {batching && (
            <StaticBatching cell={(typeof batching === 'object' && batching.cell) || 20} />
          )}
          {minDpr < maxDpr && (
            <PerformanceMonitor
              factor={1}
              flipflops={4}
              onChange={({ factor }) =>
                setDprCeiling(Math.round((minDpr + (maxDpr - minDpr) * factor) * 20) / 20)
              }
              onFallback={() => setDprCeiling(minDpr)}
            />
          )}
          {fog && <fog attach="fog" args={[fog.color, fog.near * unit, fog.far * unit]} />}
          {lights && (
            <>
              <ambientLight intensity={0.6} />
              <directionalLight
                position={[12, 18, 8]}
                intensity={1.6}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-near={1}
                shadow-camera-far={60}
                shadow-camera-left={-25}
                shadow-camera-right={25}
                shadow-camera-top={25}
                shadow-camera-bottom={-25}
              />
            </>
          )}
          <LightBudget
            point={typeof lightBudget === 'number' ? lightBudget : lightBudget.point}
            spot={typeof lightBudget === 'number' ? undefined : lightBudget.spot}
          >
            {/* Stepped by <FrameStep> below, never by rapier's own loop. */}
            <Physics gravity={gravity} paused debug={debug} timeStep="vary">
              <FrameStep />
              {children}
            </Physics>
          </LightBudget>
        </WorldContext.Provider>
      </Canvas>
    </KeyboardControls>
  )
}

const DEFAULT_DPR: [number, number] = [1, 1.5]
const DEFAULT_LIGHT_BUDGET = { point: 6, spot: 2 }

// The longest single physics step. A longer frame (a hitch, a tab coming back into view) is split
// into sub-steps so nothing moves far enough in one step to pass through a thin collider.
const MAX_STEP = 1 / 30

/**
 * Step physics once per rendered frame, by that frame's delta. The avatar controller
 * (ecctrl) pushes its body and moves its camera every rendered frame, so a fixed 1/60 step that
 * runs zero or two times a frame (always, on a 120 Hz display) makes the view stall and lurch.
 */
function FrameStep() {
  const { step } = useRapier()
  useFrame((_, dt) => {
    const frame = Math.min(dt, 0.5)
    const n = Math.ceil(frame / MAX_STEP)
    for (let i = 0; i < n; i++) step(frame / n)
  })
  return null
}

/**
 * R3F zeroes the clock whenever the frame loop restarts, which would snap every
 * clock-driven animation back to its start on resume. The clock only ever runs backwards
 * at such a restart, so put it back to where it stopped. Runs before other frame callbacks.
 */
function KeepClock() {
  const last = useRef(0)
  useFrame(({ clock, frameloop }) => {
    if (frameloop === 'never') return
    if (clock.elapsedTime < last.current) clock.elapsedTime = last.current
    last.current = clock.elapsedTime
  }, -1)
  return null
}
