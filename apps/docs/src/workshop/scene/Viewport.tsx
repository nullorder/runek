import { registry } from '@runek/components'
import {
  createGroundIndex,
  GroundContext,
  World,
  type WorldData,
  type WorldNode,
  WorldNodes,
} from '@runek/core'
import { useMemo } from 'react'
import { ThumbnailBaker } from '../outliner/Thumbs'
import { StageView } from '../stage/Stage'
import { walk } from '../state/ops'
import { select, useWorkshop } from '../state/store'
import { CameraRig } from './CameraRig'
import { EditScene } from './EditScene'
import { GlProbe, StatsProbe } from './Probes'
import { live } from './refs'

const has = (world: WorldData, type: string) => {
  let found = false
  walk(world.nodes, (node) => {
    if (node.type === type) found = true
  })
  return found
}

/** The workshop's own canvas (Build and Code modes): stage + the world being edited, or the
 *  world as it really renders while playing. */
export default function Viewport() {
  const world = useWorkshop((s) => s.world)
  const stage = useWorkshop((s) => s.stage)
  const view = useWorkshop((s) => s.view)
  const playing = useWorkshop((s) => s.playing)
  const previewTime = useWorkshop((s) => s.previewTime)
  const hasRig = useMemo(() => has(world, 'LightRig'), [world])
  const hasSky = useMemo(() => has(world, 'Sky'), [world])

  return (
    <World
      unit={world.unit}
      gravity={world.gravity}
      ground={world.ground}
      palette={world.palette}
      fonts={world.fonts}
      fog={world.fog}
      time={previewTime ?? world.time}
      timezone={world.timezone}
      avatar={world.avatar}
      controls={world.controls}
      lights={!hasRig}
      input={playing}
      debug={view.colliders}
      onPointerMissed={() => select(null)}
    >
      <GlProbe />
      <ThumbnailBaker />
      {view.stats && <StatsProbe />}
      <StageView stage={stage} grid={view.grid && !playing} sky={!hasSky} exit={playing} />
      {playing ? (
        <PlayScene world={world} />
      ) : (
        <>
          <EditScene />
          <CameraRig />
        </>
      )}
    </World>
  )
}

const BODY: WorldNode = {
  type: 'Person',
  props: { physics: false, height: 1.3, position: [0, -0.65, 0], seed: 7, lookAt: false },
}

/** The world exactly as `WorldRenderer` draws it, plus a `Player` at the camera focus when the
 *  world has none of its own. */
function PlayScene({ world }: { world: WorldData }) {
  const ground = useMemo(() => createGroundIndex(world, registry), [world])
  const nodes = useMemo(() => {
    if (has(world, 'Player')) return world.nodes
    const target = live.camera?.target ?? [0, 0, 0]
    const y = ground.groundAt(target[0], target[2])
    const spawn: WorldNode = {
      type: 'Player',
      id: 'workshop-player',
      props: { position: [target[0], (Number.isFinite(y) ? y : 0) + 1.6, target[2]] },
      children: [BODY],
    }
    return [...world.nodes, spawn]
  }, [world])
  return (
    <GroundContext.Provider value={ground}>
      <WorldNodes nodes={nodes} registry={registry} ground={ground} />
    </GroundContext.Provider>
  )
}
