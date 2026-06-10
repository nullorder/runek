import { KeyboardControls, type KeyboardControlsEntry } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { type ReactNode, useMemo } from 'react'
import { WorldContext } from './context'
import { keyboardMap as defaultKeyboardMap } from './keyboard'
import { DEFAULT_PALETTE, type WorldPalette } from './palette'
import type { Vec3, WorldFog } from './types'

export interface WorldProps {
  unit?: number
  gravity?: Vec3
  keyboardMap?: KeyboardControlsEntry[]
  /** Render the default light rig. Set false to supply your own (e.g. <LightRig>). */
  lights?: boolean
  /** Override color slots; unset slots keep their defaults. Components read these via `useWorld()`. */
  palette?: Partial<WorldPalette>
  /** Linear distance fog. Pair the color with your sky's horizon. */
  fog?: WorldFog
  /** Fired when a pointer click misses every object (used to deselect in the editor). */
  onPointerMissed?: () => void
  debug?: boolean
  children?: ReactNode
}

export function World({
  unit = 1,
  gravity = [0, -9.81, 0],
  keyboardMap = defaultKeyboardMap,
  lights = true,
  palette,
  fog,
  onPointerMissed,
  debug = false,
  children,
}: WorldProps) {
  const context = useMemo(
    () => ({ unit, gravity, palette: { ...DEFAULT_PALETTE, ...palette } }),
    [unit, gravity, palette],
  )

  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas shadows camera={{ position: [6, 4, 6], fov: 60 }} onPointerMissed={onPointerMissed}>
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
