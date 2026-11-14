import { useThree } from '@react-three/fiber'
import { lazyModule, useNodeRenderer, useWorld } from '@runek/core'
import { type DependencyList, useLayoutEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'
import { useLadder } from './glow'
import { acquireKit, KitBuilder, kitUniforms, releaseKit } from './kit'
import { applyTowerLight, nightFactor, towerLight } from './towerLight'

// The kit's node (TSL) materials, loaded only under a node renderer.
const kitNodes = lazyModule(() => import('../nodes/kit'))

/**
 * Register a component's kit parts with the scene's shared instanced meshes. `build` describes
 * the parts in local space and must be a pure function of `deps`. Attach the returned ref to a
 * group at the component's origin: its world matrix places the parts. `place` is any value that
 * changes when that group moves (the position and rotation props).
 */
export function useKit(build: (kit: KitBuilder) => void, deps: DependencyList, place: unknown) {
  const parts = useMemo(() => {
    const kit = new KitBuilder()
    build(kit)
    return kit
  }, deps)
  return useKitParts(parts, place)
}

/**
 * The same, for a component that built its own `KitBuilder` because it needs more than the
 * instances out of it (Tower reads `solids` to make its colliders). `parts` must be memoized.
 */
export function useKitParts(parts: KitBuilder, place: unknown) {
  const ref = useRef<Group>(null)
  const scene = useThree((s) => s.scene)
  const nodes = useNodeRenderer() ? kitNodes() : null
  const { fonts, time } = useWorld()
  const ladder = useLadder()
  const night = Math.round(nightFactor(time.hours) * 10) / 10

  useLayoutEffect(() => applyTowerLight(ladder), [ladder])
  useLayoutEffect(() => {
    kitUniforms.uNight.value = night
    towerLight.night = night
  }, [night])
  const placeKey = JSON.stringify(place)
  useLayoutEffect(() => {
    const group = ref.current
    if (!group) return
    group.updateWorldMatrix(true, false)
    const kit = acquireKit(scene, nodes?.kitNodeMaterials, fonts)
    const id = kit.add(parts, group.matrixWorld)
    return () => {
      kit.remove(id)
      releaseKit(scene)
    }
  }, [parts, scene, nodes, fonts.display, fonts.body, placeKey])
  return ref
}
