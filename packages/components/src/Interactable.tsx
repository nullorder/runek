import { Billboard } from '@react-three/drei'
import {
  type InteractionAction,
  keyLabel,
  useInteraction,
  useWorld,
  type Vec3,
  type WorldComponentProps,
} from '@runek/core'
import { type ReactNode, useRef } from 'react'
import type { Group } from 'three'
import { Sign } from './Sign'

export interface InteractableProps extends WorldComponentProps {
  /** What the player can do here. Each names a world `controls` action for its key, so declare
   *  it in the world (`controls: { use: ['KeyE'] }`). */
  actions?: InteractionAction[]
  /** How close the avatar must come for the prompt to show, in units. */
  radius?: number
  /** Height of the prompt above the origin, in units. */
  promptHeight?: number
  onAction?: (id: string) => void
  children?: ReactNode
}

export interface InteractionPromptProps {
  actions: InteractionAction[]
  position?: Vec3
  /** Cap height of the text, in units. */
  size?: number
}

const INK = '#f6f1e7'

/** The key-and-label rows over something you can act on: one row per action, its key cap showing
 *  the key the world binds to it (so a remap relabels it). Always faces the camera. */
export function InteractionPrompt({ actions, position, size = 0.09 }: InteractionPromptProps) {
  const { unit, palette, controls } = useWorld()
  const s = size * unit
  const row = s * 2.3
  return (
    <Billboard position={position}>
      {actions.map((action, i) => {
        const code = controls[action.control]?.[0]
        const key = code ? keyLabel(code) : '?'
        const cap = Math.max(1, key.length * 0.62) * s + s * 0.9
        const y = (actions.length - 1 - i) * row
        return (
          <group key={action.id} position={[0, y, 0]}>
            <mesh position={[-cap / 2, 0, 0]} renderOrder={1}>
              <planeGeometry args={[cap, s * 1.75]} />
              <meshBasicMaterial color={palette.accent} toneMapped={false} />
            </mesh>
            <Sign
              position={[-cap / 2, 0, 0.002 * unit]}
              variant="body"
              size={size}
              color={palette.metal}
            >
              {key}
            </Sign>
            <Sign
              position={[s * 0.6, 0, 0]}
              variant="body"
              size={size}
              color={INK}
              outline={palette.metal}
              anchorX="left"
            >
              {action.label}
            </Sign>
          </group>
        )
      })}
    </Billboard>
  )
}

/**
 * Wrap anything to make it something the player can act on: walk within `radius` and a prompt
 * appears over it (`E Use`), press the key and `onAction` gets the action's `id`. Of everything
 * in range only the nearest shows its prompt and takes the key, and keys already yield to text
 * fields on the page. The actions are plain JSON, so a world file can declare them; the callback
 * is the host's. No geometry or colliders of its own.
 *
 * ```tsx
 * <World controls={{ use: ['KeyE'] }}>
 *   <Interactable actions={[{ id: 'sit', label: 'Sit', control: 'use' }]} onAction={sitDown}>
 *     <Chair />
 *   </Interactable>
 * </World>
 * ```
 */
export function Interactable({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  actions = [],
  radius = 2,
  promptHeight = 1.4,
  onAction,
  children,
}: InteractableProps) {
  const { unit } = useWorld()
  const anchor = useRef<Group>(null)
  const focused = useInteraction(anchor, { actions, radius, onAction })
  return (
    <group ref={anchor} position={position} rotation={rotation}>
      {children}
      {focused && <InteractionPrompt actions={actions} position={[0, promptHeight * unit, 0]} />}
    </group>
  )
}
