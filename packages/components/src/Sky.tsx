import { Sky as DreiSky, Stars } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { lazyModule, useNodeRenderer, useSun, type Vec3 } from '@runek/core'
import { useEffect, useMemo } from 'react'

// The WebGPU (TSL) twins of drei's Sky and Stars, loaded only under a node renderer.
const skyNodes = lazyModule(() => import('./nodes/sky'))
type SkyNodes = Awaited<ReturnType<typeof skyNodes>>

export interface SkyProps {
  /** Accepted for the component contract; this component has no seeded variation yet. */
  seed?: number
  /** Direction of the sun; also where the bright spot appears. Set this to pin the
   *  sky to a fixed sun and bypass the world's day/night cycle. */
  sunPosition?: Vec3
  turbidity?: number
  rayleigh?: number
  /** Background when the sun is below the horizon. */
  nightColor?: string
}

/**
 * Procedural atmospheric sky (no textures). With no explicit `sunPosition` it
 * follows the world's time-of-day (`<World time>` / `timezone`): the sun arcs
 * overhead by day, and at night the dome swaps to a dark sky with a procedural
 * starfield. Pass `sunPosition` to pin a fixed sun and opt out of the cycle.
 */
export function Sky({
  sunPosition,
  turbidity = 8,
  rayleigh = 1.4,
  nightColor = '#04060e',
}: SkyProps) {
  const sun = useSun()
  const nodes = useNodeRenderer() ? skyNodes() : null
  if (nodes) {
    const position = sunPosition ?? sun.position
    if (!sunPosition && !sun.day) return <NodeStars nodes={nodes} nightColor={nightColor} />
    return <NodeSky nodes={nodes} sun={position} turbidity={turbidity} rayleigh={rayleigh} />
  }
  if (sunPosition) {
    return <DreiSky sunPosition={sunPosition} turbidity={turbidity} rayleigh={rayleigh} />
  }

  if (!sun.day) {
    return (
      <>
        <color attach="background" args={[nightColor]} />
        <Stars radius={80} depth={50} count={2500} factor={4} saturation={0} fade speed={0.4} />
      </>
    )
  }
  return <DreiSky sunPosition={sun.position} turbidity={turbidity} rayleigh={rayleigh} />
}

function NodeSky({
  nodes,
  sun,
  turbidity,
  rayleigh,
}: {
  nodes: SkyNodes
  sun: Vec3
  turbidity: number
  rayleigh: number
}) {
  const sky = useMemo(() => nodes.skyMesh(), [nodes])
  useEffect(() => () => (sky.material as { dispose(): void }).dispose(), [sky])
  sky.turbidity.value = turbidity
  sky.rayleigh.value = rayleigh
  sky.sunPosition.value.set(...sun)
  return <primitive object={sky} />
}

function NodeStars({ nodes, nightColor }: { nodes: SkyNodes; nightColor: string }) {
  const stars = useMemo(
    () => nodes.starField({ radius: 80, depth: 50, count: 2500, factor: 4, fade: true }),
    [nodes],
  )
  useEffect(() => () => stars.dispose(), [stars])
  useFrame(({ clock }) => {
    stars.time.value = clock.elapsedTime * 0.4
  })
  return (
    <>
      <color attach="background" args={[nightColor]} />
      <primitive object={stars.mesh} />
    </>
  )
}

// Mounted wherever the viewer is when a world streams.
Sky.stream = false
