import { useFrame } from '@react-three/fiber'
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react'
import { type Object3D, Vector3 } from 'three'
import type { Interactor } from './types'
import { useWorld } from './useWorld'

/** Something the player can do to a thing when standing near it: plain JSON. */
export interface InteractionAction {
  /** Passed back to `onAction`. */
  id: string
  /** Shown in the prompt, e.g. `Talk`. */
  label: string
  /** The world `controls` action that triggers it (declare `talk: ['KeyT']` in the world's
   *  `controls`). The prompt shows the key bound to it, so a remap relabels it. */
  control: string
}

export interface InteractionOptions {
  actions: InteractionAction[]
  /** How close the avatar must come, in units. Default 2. */
  radius?: number
  onAction?: (id: string) => void
  /** Default true. */
  enabled?: boolean
}

/** How far above or below the avatar's eye a thing can be and still be in reach, in meters: a
 *  floor's height, so a figure on the storey above doesn't claim the prompt. */
const REACH_Y = 2.5

/** True when `self` is the nearest candidate in range; ties go to whoever registered first. */
export function isNearest(self: Interactor, all: Iterable<Interactor>): boolean {
  if (!Number.isFinite(self.distance)) return false
  let earlier = true
  for (const other of all) {
    if (other === self) earlier = false
    else if (earlier ? other.distance <= self.distance : other.distance < self.distance)
      return false
  }
  return true
}

/**
 * Offer `actions` to the player while the avatar (the camera, with no `Player` mounted) stands
 * within `radius` of `anchor`, measured across the ground. Of everything in range, only the
 * nearest is focused, so two figures side by side never both claim a key. A bound key pressed
 * while focused calls `onAction` with the action's `id`; keys come through the world's own
 * keyboard, so they already yield to text fields, `input={false}`, and `paused`.
 *
 * Returns whether this one is focused, for drawing a prompt (see `Interactable`).
 */
export function useInteraction(
  anchor: RefObject<Object3D | null>,
  { actions, radius = 2, onAction, enabled = true }: InteractionOptions,
): boolean {
  const { unit, player, interactions, keyboard, controls } = useWorld()
  const self = useMemo<Interactor>(() => ({ distance: Number.POSITIVE_INFINITY }), [])
  const [focused, setFocused] = useState(false)
  const v = useMemo(() => ({ at: new Vector3(), from: new Vector3() }), [])
  const live = enabled && actions.length > 0

  useEffect(() => {
    if (!interactions || !live) return
    interactions.add(self)
    return () => {
      interactions.delete(self)
      self.distance = Number.POSITIVE_INFINITY
      setFocused(false)
    }
  }, [interactions, self, live])

  useFrame(({ camera }) => {
    const node = anchor.current
    if (!live || !node) return
    node.getWorldPosition(v.at)
    const avatar = player?.current
    if (avatar) avatar.getWorldPosition(v.from)
    else v.from.copy(camera.position)
    const d = Math.hypot(v.at.x - v.from.x, v.at.z - v.from.z)
    const near = d <= radius * unit && Math.abs(v.at.y - v.from.y) <= REACH_Y * unit
    self.distance = near ? d : Number.POSITIVE_INFINITY
    const next = isNearest(self, interactions ?? [self])
    if (next !== focused) setFocused(next)
  })

  // The latest callback and actions, so a re-render never re-subscribes the keyboard.
  const latest = useRef({ actions, onAction })
  latest.current = { actions, onAction }
  useEffect(() => {
    if (!keyboard || !live) return
    const down = new Set<string>()
    const onDown = (event: Event) => {
      const { code } = event as KeyboardEvent
      if (down.has(code)) return
      down.add(code)
      // Decided at the press from last frame's distances, so exactly one candidate wins it.
      if (!isNearest(self, interactions ?? [self])) return
      const { actions, onAction } = latest.current
      const action = actions.find((a) => controls[a.control]?.includes(code))
      if (action) onAction?.(action.id)
    }
    const onUp = (event: Event) => down.delete((event as KeyboardEvent).code)
    keyboard.addEventListener('keydown', onDown)
    keyboard.addEventListener('keyup', onUp)
    return () => {
      keyboard.removeEventListener('keydown', onDown)
      keyboard.removeEventListener('keyup', onUp)
    }
  }, [keyboard, live, self, interactions, controls])

  return focused && live
}
