import type { KeyboardControlsEntry } from '@react-three/drei'

/**
 * Default input bindings. Movement/jump/run action names are the ones ecctrl reads; the
 * `turn*`/`look*` actions are consumed by `Player` to move the camera from the keyboard
 * (see `@runek/components`). WASD drives movement so the arrow keys are free to steer the
 * camera — Left/Right turn (yaw), Up/Down look (pitch) — alongside mouse-drag.
 */
export const keyboardMap: KeyboardControlsEntry[] = [
  { name: 'forward', keys: ['KeyW'] },
  { name: 'backward', keys: ['KeyS'] },
  { name: 'leftward', keys: ['KeyA'] },
  { name: 'rightward', keys: ['KeyD'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
  { name: 'turnLeft', keys: ['ArrowLeft'] },
  { name: 'turnRight', keys: ['ArrowRight'] },
  { name: 'lookUp', keys: ['ArrowUp'] },
  { name: 'lookDown', keys: ['ArrowDown'] },
]
