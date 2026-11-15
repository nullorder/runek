import { useFrame, useThree } from '@react-three/fiber'
import { DYNAMIC_KEY, skipMirrors, useWorld, type WaterSample, waterAt } from '@runek/core'
import { useEffect, useState } from 'react'
import { BackSide, Color, Fog, Mesh, MeshBasicMaterial, SphereGeometry } from 'three'

// What water that says nothing of itself looks like from inside (`WaterBody.color`, `clarity`):
// its color, and how far one sees through it, in meters.
const COLOR = '#1f6f8c'
const CLARITY = 20
/** Where the fog starts, as a part of how far one sees: behind the camera, so that whatever is in
 *  the water is tinted by it, however near. */
const NEAR = -0.3
/** The camera is under once it is this far below the surface, in meters. */
const UNDER = 0.03
// A fog that fogs nothing, for a world without one (see below).
const CLEAR = [1e6, 1e7] as const

/** Whether `fog` is a linear one, whose range can be changed in place. */
const isLinear = (fog: unknown): fog is Fog => (fog as Fog | null)?.isFog === true

/**
 * The view from under water. While the camera is below the surface of water in the world (an
 * `Ocean`, a `Lake`, a `Pool`), the world's distance fog becomes the water: its color, and a
 * range as short as the water is clear. A sphere of that color at the end of the range stands
 * in for everything further off, the sky included, which no fog reaches.
 *
 * The fog the world already has is changed in place and put back on the way out, so no material
 * is compiled again under either renderer. A world without fog is given one that fogs nothing
 * the first time there is water in it, for the same reason. Mounted by `Player`; a world with a
 * camera of its own can mount one beside it.
 */
export function Underwater() {
  const scene = useThree((three) => three.scene)
  const { waters, unit } = useWorld()
  const [v] = useState(() => {
    const backdrop = new Mesh(
      new SphereGeometry(1, 24, 12),
      new MeshBasicMaterial({ side: BackSide, fog: false }),
    )
    backdrop.visible = false
    backdrop.frustumCulled = false
    backdrop.userData[DYNAMIC_KEY] = true
    return {
      backdrop,
      own: new Fog('#ffffff', ...CLEAR),
      // The fog being stood in for, and what it was.
      kept: null as { fog: Fog; color: Color; near: number; far: number } | null,
      sample: { level: 0, swell: 0 } as WaterSample,
      color: new Color(),
      named: '',
    }
  })

  useEffect(() => {
    const { backdrop, own } = v
    scene.add(backdrop)
    const mirrored = skipMirrors(backdrop)
    return () => {
      mirrored()
      scene.remove(backdrop)
      surface(v)
      if (scene.fog === own) scene.fog = null
    }
  }, [scene, v])
  useEffect(
    () => () => {
      v.backdrop.geometry.dispose()
      v.backdrop.material.dispose()
    },
    [v],
  )

  useFrame(({ camera }) => {
    if (!waters?.size) return surface(v)
    if (!scene.fog) scene.fog = v.own
    const at = camera.position
    const water = waterAt(waters, at.x, at.y, at.z, v.sample)
    const fog = scene.fog
    if (!water || at.y > water.level + water.swell - UNDER * unit || !isLinear(fog)) {
      return surface(v)
    }
    if (v.kept?.fog !== fog) {
      surface(v)
      v.kept = { fog, color: fog.color.clone(), near: fog.near, far: fog.far }
    }
    const named = water.body?.color ?? COLOR
    if (named !== v.named) {
      v.named = named
      v.color.set(named)
    }
    const clarity = water.body?.clarity ?? CLARITY * unit
    fog.color.copy(v.color)
    fog.near = NEAR * clarity
    fog.far = clarity
    // Just inside where the fog closes, so nothing shows a hard edge against it.
    v.backdrop.visible = true
    v.backdrop.position.copy(at)
    v.backdrop.scale.setScalar(clarity * 0.98)
    v.backdrop.material.color.copy(v.color)
  })
  return null
}

/** Back above the water: put the world's fog back as it was. */
function surface(v: {
  backdrop: Mesh
  kept: { fog: Fog; color: Color; near: number; far: number } | null
}) {
  v.backdrop.visible = false
  if (!v.kept) return
  const { fog, color, near, far } = v.kept
  fog.color.copy(color)
  fog.near = near
  fog.far = far
  v.kept = null
}
