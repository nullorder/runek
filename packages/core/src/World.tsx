import { KeyboardControls, type KeyboardControlsEntry } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { type ReactNode, useMemo } from 'react'
import { WorldContext } from './context'
import { DEFAULT_FONTS, type WorldFonts } from './font'
import { controlsToMap, resolveControls, type WorldControls } from './keyboard'
import { DEFAULT_PALETTE, type WorldPalette } from './palette'
import { resolveWorldTime } from './time'
import type { AvatarView, Vec3, WorldFog } from './types'

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
    }),
    [unit, gravity, ground, palette, fonts, time, timezone, avatar, resolvedControls],
  )

  return (
    <KeyboardControls map={inputMap}>
      <Canvas
        shadows
        camera={{ position: [6, 4, 6], fov: 60 }}
        gl={{ preserveDrawingBuffer }}
        onPointerMissed={onPointerMissed}
      >
        <WorldContext.Provider value={context}>
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
          <Physics gravity={gravity} debug={debug}>
            {children}
          </Physics>
        </WorldContext.Provider>
      </Canvas>
    </KeyboardControls>
  )
}
