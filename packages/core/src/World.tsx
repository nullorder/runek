import { KeyboardControls, type KeyboardControlsEntry } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { type ReactNode, useMemo, useRef } from 'react'
import type { Object3D } from 'three'
import { WorldContext } from './context'
import { DEFAULT_FONTS, type WorldFonts } from './font'
import { useKeySource } from './input'
import { controlsToMap, resolveControls, type WorldControls } from './keyboard'
import { DEFAULT_PALETTE, type WorldPalette } from './palette'
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

  return (
    // drei types `domElement` as an element but only listens on it, so any EventTarget works.
    <KeyboardControls map={inputMap} domElement={keySource as HTMLElement}>
      <Canvas
        frameloop={paused ? 'never' : 'always'}
        shadows
        camera={{ position: [6, 4, 6], fov: 60 }}
        gl={{ preserveDrawingBuffer }}
        onPointerMissed={onPointerMissed}
      >
        <WorldContext.Provider value={context}>
          <KeepClock />
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
          <Physics gravity={gravity} paused={paused} debug={debug}>
            {children}
          </Physics>
        </WorldContext.Provider>
      </Canvas>
    </KeyboardControls>
  )
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
