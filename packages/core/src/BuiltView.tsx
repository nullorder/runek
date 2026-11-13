import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useMemo } from 'react'
import {
  type BuildContext,
  type BuildFunction,
  type Built,
  type BuiltLight,
  shapeGeometry,
} from './build'
import { useLight } from './light'
import { useMaterials } from './material'
import type { Vec3 } from './types'
import { useWorld } from './useWorld'

function BuiltLightView({ light }: { light: BuiltLight }) {
  const emitter = useLight(light.look)
  return (
    <>
      <object3D ref={emitter.ref} position={light.position} />
      {light.target && <object3D ref={emitter.target} position={light.target} />}
    </>
  )
}

/**
 * Draw a `Built` as React: its parts as meshes on shared materials, its colliders on a fixed
 * body at `position` and `rotation`, its lights through the world's light pool. A component with a
 * `build` renders this from its React form, so both ways of mounting it draw the same thing.
 */
export function BuiltView({
  built,
  position,
  rotation,
}: {
  built: Built
  position?: Vec3
  rotation?: Vec3
}) {
  const materials = useMaterials(built.parts.map((part) => part.look))
  const parts = built.parts.map((part, i) => (
    <mesh
      // biome-ignore lint/suspicious/noArrayIndexKey: a build's parts are a fixed list
      key={i}
      geometry={shapeGeometry(part.shape)}
      material={materials[i]}
      position={part.position}
      rotation={part.rotation}
      castShadow={part.castShadow}
      receiveShadow={part.receiveShadow}
    />
  ))
  const lights = built.lights?.map((light, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: a build's lights are a fixed list
    <BuiltLightView key={i} light={light} />
  ))
  if (!built.colliders?.length) {
    return (
      <group position={position} rotation={rotation}>
        {parts}
        {lights}
      </group>
    )
  }
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      {built.colliders.map((c, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a build's colliders are a fixed list
        <CuboidCollider key={i} args={c.cuboid} position={c.position} rotation={c.rotation} />
      ))}
      {parts}
      {lights}
    </RigidBody>
  )
}

/** The world's side of a build: what `build` reads, from `useWorld()`. */
export function useBuildContext(): BuildContext {
  const { unit, palette } = useWorld()
  return useMemo(() => ({ unit, palette }), [unit, palette])
}

/** `build(props, ctx)` for a component's React form, rebuilt only when its props change. */
export function useBuilt<P extends object>(build: BuildFunction<P>, props: P): Built {
  const ctx = useBuildContext()
  const { position: _p, rotation: _r, children: _c, ...shape } = props as Record<string, unknown>
  const key = JSON.stringify(shape)
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed by value, like useMaterial
  return useMemo(() => build(props, ctx), [build, key, ctx])
}
