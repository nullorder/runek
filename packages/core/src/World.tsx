import { KeyboardControls, type KeyboardControlsEntry } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import type { ReactNode } from 'react'
import { WorldContext } from './context'
import { keyboardMap as defaultKeyboardMap } from './keyboard'
import type { Vec3 } from './types'

export interface WorldProps {
  unit?: number
  gravity?: Vec3
  keyboardMap?: KeyboardControlsEntry[]
  debug?: boolean
  children?: ReactNode
}

export function World({
  unit = 1,
  gravity = [0, -9.81, 0],
  keyboardMap = defaultKeyboardMap,
  debug = false,
  children,
}: WorldProps) {
  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas shadows camera={{ position: [6, 4, 6], fov: 60 }}>
        <WorldContext.Provider value={{ unit, gravity }}>
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
          <Physics gravity={gravity} debug={debug}>
            {children}
          </Physics>
        </WorldContext.Provider>
      </Canvas>
    </KeyboardControls>
  )
}
