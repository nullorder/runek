import { Grid } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import {
  Barrel,
  Bench,
  Clock,
  Crate,
  Desk,
  Floor,
  Lamp,
  Monitor,
  OfficeChair,
  Plant,
  Portal,
  Rug,
  Shelf,
  Sign,
  Sky,
  Wall,
  Whiteboard,
} from '@runek/components'
import { memo } from 'react'
import type { Stage as StageKind } from '../share/codec'

const GREEN = '#3df58a'
const HALF = 15
const WALL_H = 5.5
const WALL = '#c3bcae'
const FLOOR = '#585c62'

/** The library's next room: a hall with a lit 20 × 20 m build plot in the middle. Not part of
 *  the world being built; the floor sits at the world's ground baseline. */
export const Hall = memo(function Hall({ grid, exit }: { grid: boolean; exit: boolean }) {
  return (
    <group name="stage">
      <Floor position={[0, 0, 0]} size={[HALF * 2 + 0.4, HALF * 2 + 0.4]} color={FLOOR} />
      {grid && <PlotGrid size={20} />}

      <Wall position={[0, 0, -HALF]} width={HALF * 2} height={WALL_H} color={WALL} />
      <Wall
        position={[0, 0, HALF]}
        width={HALF * 2}
        height={WALL_H}
        color={WALL}
        openings={[{ width: 2.6, height: 3.2 }]}
      />
      <Wall
        position={[HALF, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        width={HALF * 2}
        height={WALL_H}
        color={WALL}
        openings={[
          { offset: -7, width: 3, height: 2, sill: 1.6 },
          { offset: 7, width: 3, height: 2, sill: 1.6 },
        ]}
      />
      <Wall
        position={[-HALF, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        width={HALF * 2}
        height={WALL_H}
        color={WALL}
      />

      <Sign position={[0, 4.3, -HALF + 0.16]} size={0.85} color={GREEN} glow>
        WORKSHOP
      </Sign>
      <Sign position={[0, 3.75, -HALF + 0.16]} size={0.2} color="#8fb8a8">
        build · tune · share · take it home
      </Sign>
      <Clock position={[7.5, 3.9, -HALF + 0.12]} accentColor={GREEN} frameColor="#2c2118" />

      <Sign
        position={[0, 3.75, HALF - 0.16]}
        rotation={[0, Math.PI, 0]}
        size={0.32}
        color={GREEN}
        glow
      >
        ← LIBRARY
      </Sign>
      <Floor position={[0, 0, HALF + 1.6]} size={[3.2, 3]} color={FLOOR} />
      <Portal position={[0, 0, HALF + 1]} radius={1.35} to="/library" color={GREEN} active={exit} />

      {/* West wall: storage and the seed whiteboard. */}
      <Whiteboard
        position={[-HALF + 0.12, 1.3, -3]}
        rotation={[0, Math.PI / 2, 0]}
        mount="wall"
        width={2.4}
        height={1.3}
        text="same seed = same world"
        seed={7}
      />
      <Shelf
        position={[-HALF + 0.3, 0, 4]}
        rotation={[0, Math.PI / 2, 0]}
        width={1.6}
        height={2.2}
      />
      <Shelf
        position={[-HALF + 0.3, 0, 6]}
        rotation={[0, Math.PI / 2, 0]}
        width={1.6}
        height={2.2}
      />
      <Crate position={[-HALF + 0.9, 0, 9]} size={0.8} seed={3} />
      <Crate position={[-HALF + 0.85, 0.8, 9.05]} size={0.6} seed={8} rotation={[0, 0.4, 0]} />
      <Barrel position={[-HALF + 0.8, 0, 10.4]} />
      <Barrel position={[-HALF + 1.6, 0, 10.1]} />

      {/* East wall: the workbench. */}
      <Desk
        position={[HALF - 0.6, 0, -1]}
        rotation={[0, -Math.PI / 2, 0]}
        width={2.2}
        seed={4}
        base="pedestal"
      />
      <Monitor position={[HALF - 0.55, 0.75, -1.4]} rotation={[0, -Math.PI / 2, 0]} seed={9} />
      <Monitor position={[HALF - 0.55, 0.75, -0.4]} rotation={[0, -Math.PI / 2, 0]} seed={12} />
      <OfficeChair position={[HALF - 1.6, 0, -1]} rotation={[0, Math.PI / 2, 0]} seed={5} />
      <Rug position={[HALF - 1.6, 0.01, -1]} size={[2.6, 3]} seed={11} />

      <Bench position={[-4, 0, HALF - 0.7]} rotation={[0, Math.PI, 0]} />
      <Bench position={[4, 0, HALF - 0.7]} rotation={[0, Math.PI, 0]} />
      <Plant position={[-2, 0, HALF - 0.6]} seed={2} height={1.1} />
      <Plant position={[2, 0, HALF - 0.6]} seed={6} height={1.1} />

      {CORNERS.map(([x, z]) => (
        <Lamp key={`${x}:${z}`} position={[x, 0, z]} height={2.4} intensity={24} />
      ))}
    </group>
  )
})

const CORNERS: [number, number][] = [
  [-HALF + 1, -HALF + 1],
  [HALF - 1, -HALF + 1],
  [-HALF + 1, HALF - 1],
  [HALF - 1, HALF - 1],
]

function PlotGrid({ size, infinite = false }: { size: number; infinite?: boolean }) {
  return (
    <Grid
      position={[0, 0.012, 0]}
      args={[size, size]}
      cellSize={1}
      cellThickness={0.6}
      cellColor="#2b4a3c"
      sectionSize={5}
      sectionThickness={1.1}
      sectionColor={GREEN}
      fadeDistance={infinite ? 90 : 60}
      fadeStrength={1.2}
      infiniteGrid={infinite}
      followCamera={infinite}
    />
  )
}

/** An open plot under the sky, with a ground plane to stand on (for outdoor worlds). */
const Plot = memo(function Plot({ grid }: { grid: boolean }) {
  return (
    <group name="stage">
      {grid && <PlotGrid size={20} infinite />}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[500, 0.05, 500]} position={[0, -0.05, 0]} />
      </RigidBody>
    </group>
  )
})

export function StageView({
  stage,
  grid,
  sky,
  exit = false,
}: {
  stage: StageKind
  grid: boolean
  sky: boolean
  /** Walking out of the Workshop's door leads back to the library (in play only). */
  exit?: boolean
}) {
  if (stage === 'none') return grid ? <PlotGrid size={20} infinite /> : null
  return (
    <>
      {sky && <Sky />}
      {stage === 'room' ? <Hall grid={grid} exit={exit} /> : <Plot grid={grid} />}
    </>
  )
}
