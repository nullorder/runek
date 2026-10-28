import { sub, type Vec3 } from '@runek/core'
import { Barrel } from '../Barrel'
import { Bed } from '../Bed'
import { Chair } from '../Chair'
import { Crate } from '../Crate'
import { Staircase } from '../Staircase'
import { CASTLE_STAIR, LEVEL, type ShipLayout, STAIR, STEPS } from '../surfaces/ship'
import { Table } from '../Table'
import type { Cargo, Piece } from './fittings'
import type { V3 } from './mesh'

/** The flights between levels, as the catalog's own `Staircase`, placed in world units. */
export function Stairs({ lay, unit, color }: { lay: ShipLayout; unit: number; color: string }) {
  const at = (p: V3): Vec3 => [p[0] * unit, p[1] * unit, p[2] * unit]
  const { gun, hold, main, quarter, fore } = LEVEL
  const flights: {
    key: string
    at: V3
    turn: boolean
    rise: number
    run: number
    width: number
    steps: number
  }[] = [
    {
      key: 'a',
      at: [0, gun, lay.hatchA.z0 + STAIR.run],
      turn: true,
      rise: main - gun,
      run: STAIR.run,
      width: STAIR.width,
      steps: STEPS.main,
    },
    {
      key: 'b',
      at: [0, hold, lay.hatchB.z1 - STAIR.run],
      turn: false,
      rise: gun - hold,
      run: STAIR.run,
      width: STAIR.width,
      steps: STEPS.main,
    },
    ...lay.quarterStairs.map((b, i) => ({
      key: `q${i}`,
      at: [b.x, main, b.z1] as V3,
      turn: true,
      rise: quarter - main,
      run: CASTLE_STAIR.quarterRun,
      width: b.w,
      steps: STEPS.quarter,
    })),
    ...lay.foreStairs.map((b, i) => ({
      key: `f${i}`,
      at: [b.x, main, b.z0] as V3,
      turn: false,
      rise: fore - main,
      run: CASTLE_STAIR.foreRun,
      width: b.w,
      steps: STEPS.fore,
    })),
  ]
  return flights.map((f) => (
    <Staircase
      key={f.key}
      position={at(f.at)}
      rotation={[0, f.turn ? Math.PI : 0, 0]}
      form="floating"
      steps={f.steps}
      totalHeight={f.rise}
      width={f.width}
      depth={f.run}
      color={color}
    />
  ))
}

/** The cabins, mess, crew quarters and cargo, furnished from the catalog. */
export function Furnishing({
  pieces,
  cargo,
  unit,
  seed,
}: {
  pieces: Piece[]
  cargo: Cargo[]
  unit: number
  seed: number
}) {
  const at = (p: V3): Vec3 => [p[0] * unit, p[1] * unit, p[2] * unit]
  return (
    <>
      {pieces.map((p, i) => {
        const key = `${p.type}-${i}`
        const s = sub(seed, i)
        switch (p.type) {
          case 'Table':
            return (
              <Table
                key={key}
                position={at(p.position)}
                rotation={p.rotation}
                width={p.width}
                depth={p.depth}
                height={p.height}
                seed={s}
              />
            )
          case 'Chair':
            return <Chair key={key} position={at(p.position)} rotation={p.rotation} seed={s} />
          case 'Bed':
            return <Bed key={key} position={at(p.position)} rotation={p.rotation} seed={s} />
          case 'Crate':
            return (
              <Crate
                key={key}
                position={at(p.position)}
                rotation={p.rotation}
                size={p.size}
                seed={s}
              />
            )
          case 'Barrel':
            return <Barrel key={key} position={at(p.position)} seed={s} />
        }
        return null
      })}
      {cargo.map((c, i) => {
        const key = `cargo-${c.seed}`
        const s = sub(seed, 100 + i)
        if (c.kind === 'barrel') return <Barrel key={key} position={at(c.position)} seed={s} />
        const top: V3 = [c.position[0], c.position[1] + 0.8, c.position[2]]
        return (
          <group key={key}>
            <Crate position={at(c.position)} seed={s} />
            {c.stacked && (
              <Crate position={at(top)} size={0.7} rotation={[0, 0.3, 0]} seed={s + 1} />
            )}
          </group>
        )
      })}
    </>
  )
}
