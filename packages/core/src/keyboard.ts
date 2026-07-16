import type { KeyboardControlsEntry } from '@react-three/drei'

/**
 * World-remappable input bindings: action name → `KeyboardEvent.code`s. The
 * standard actions are the movement set ecctrl reads (`forward`, `backward`,
 * `leftward`, `rightward`, `jump`, `run`) and the camera-look set `Player`
 * consumes (`turnLeft`, `turnRight`, `lookUp`, `lookDown`). Unknown action
 * names are allowed: they become extra `KeyboardControls` entries readable by
 * any component via drei's `useKeyboardControls` (e.g. `interact: ["KeyE"]`).
 * Mapping an action to `[]` disables it.
 */
export type WorldControls = Record<string, string[]>

/**
 * Default bindings. WASD drives movement so the arrow keys are free to steer
 * the camera — Left/Right turn (yaw), Up/Down look (pitch) — alongside
 * mouse-drag, in both first- and third-person views.
 */
export const DEFAULT_CONTROLS: WorldControls = {
  forward: ['KeyW'],
  backward: ['KeyS'],
  leftward: ['KeyA'],
  rightward: ['KeyD'],
  jump: ['Space'],
  run: ['ShiftLeft', 'ShiftRight'],
  turnLeft: ['ArrowLeft'],
  turnRight: ['ArrowRight'],
  lookUp: ['ArrowUp'],
  lookDown: ['ArrowDown'],
}

/** A world's partial `controls` merged over the defaults. */
export function resolveControls(controls?: WorldControls): WorldControls {
  return { ...DEFAULT_CONTROLS, ...controls }
}

/** A controls map as drei `KeyboardControlsEntry`s (what `<KeyboardControls>` takes). */
export function controlsToMap(controls: WorldControls): KeyboardControlsEntry[] {
  return Object.entries(controls).map(([name, keys]) => ({ name, keys }))
}

/** The default bindings in drei entry form. */
export const keyboardMap: KeyboardControlsEntry[] = controlsToMap(DEFAULT_CONTROLS)
