import { Physics } from '@react-three/rapier'
import {
  Bench,
  CeilingLight,
  Fence,
  Floor,
  Lake,
  Lamp,
  Level,
  type LevelWalls,
  Rocks,
  Rug,
  registry,
  Sign,
  Staircase,
  Trees,
  Wall,
} from '@runek/components'
import { useMaterials, type Vec3, WorldNodes } from '@runek/core'
import { useMemo } from 'react'
import { CATEGORY_ORDER } from '../../lib/categories'
import { PREVIEW } from '../../lib/preview'
import { type Exhibit, ExhibitMini, ExhibitStand } from './Exhibit'
import { innerHalf, layoutHall, STOREY, VOID } from './hallLayout'
import type { DocMeta } from './LibraryWorld'

/**
 * The component gallery: an open-topped hall west of the library, three ring galleries around
 * a central atrium, one category per floor. Exhibits line each floor's outer wall facing the
 * void; two floating flights cross the atrium (ground to the first floor northward, first to
 * second southward), so the climb runs Grounds, Structures, Interiors. Placement comes from
 * `layoutHall`, so a new component only joins its own floor's run.
 */

/** System components with nothing to put on a pedestal. */
const EXCLUDE = new Set(['Player', 'LightRig', 'Compass', 'Sky', 'Interactable'])

/** Per-exhibit props layered over the gallery-preview config. */
const TUNE: Record<string, Record<string, unknown>> = {
  // Ocean defaults to a 400-unit patch that follows the camera — pin a small pond.
  Ocean: { size: [7, 7], follow: false },
  // Bare visual — a dynamic body would roll off the pedestal.
  Sailboat: { physics: false },
  // A model under glass: the hull and rig, without the fit-out, lights or deck colliders.
  Ship: { furnish: false, lanterns: false, collider: false },
  // A live portal navigates on contact; in the gallery it's display-only.
  Portal: { onEnter: () => {} },
}

/** Bottom to top. A category no floor names joins the ground floor. */
const FLOORS = [
  {
    name: 'Grounds',
    categories: ['terrain', 'water', 'vegetation', 'environment', 'character', 'systems'],
    accent: '#5fd0a8',
  },
  { name: 'Structures', categories: ['structures'], accent: '#7c9cff' },
  { name: 'Interiors', categories: ['interiors'], accent: '#e0a96d' },
]

/** The library's west wall, where the vestibule begins. */
const ENTRY_X = -7
const VESTIBULE = 2
const DOOR = { width: 2.4, height: 3 }
const FLIGHT = { width: 2, steps: 24, offset: 2 }
/** Ring centerline between the balustrade and the exhibits, from the hall center. */
const RING = VOID / 2 + 2.5

const FLOOR_COLOR = '#b9b2a4'

const title = (category: string) => category[0].toUpperCase() + category.slice(1)

function floorOf(category: string): number {
  const i = FLOORS.findIndex((f) => f.categories.includes(category))
  return i < 0 ? 0 : i
}

/** Section order on a floor follows the `/gallery` page; unknown categories trail. */
function rank(category: string): number {
  const i = CATEGORY_ORDER.indexOf(category)
  return i < 0 ? CATEGORY_ORDER.length : i
}

/** Fence runs along one void edge, broken where a flight meets it. */
function balustrade(gaps: [number, number][]): [number, number][] {
  const edge = VOID / 2 + 0.1
  const runs: [number, number][] = []
  let from = -edge
  for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) {
    if (a > from) runs.push([from, a])
    from = b
  }
  if (edge > from) runs.push([from, edge])
  return runs
}

function Balustrade({
  y,
  northGaps,
  southGaps,
}: {
  y: number
  northGaps: [number, number][]
  southGaps: [number, number][]
}) {
  const edge = VOID / 2 + 0.1
  const along = (key: string, runs: [number, number][], z: number) =>
    runs.map(([a, b]) => (
      <Fence
        key={`${key}-${a}`}
        position={[(a + b) / 2, y, z]}
        length={b - a}
        height={1.05}
        postSpacing={1.2}
        color="#4a3726"
      />
    ))
  const across = (key: string, x: number) => (
    <Fence
      key={key}
      position={[x, y, 0]}
      rotation={[0, Math.PI / 2, 0]}
      length={2 * edge}
      height={1.05}
      postSpacing={1.2}
      color="#4a3726"
    />
  )
  return (
    <group>
      {along('n', balustrade(northGaps), edge)}
      {along('s', balustrade(southGaps), -edge)}
      {across('e', edge)}
      {across('w', -edge)}
    </group>
  )
}

/** A runner rug around the ring, one per side, abutting at the corners. */
function RingRug({ y, accent, seed }: { y: number; accent: string; seed: number }) {
  const long = 2 * (RING + 1)
  const short = 2 * (RING - 1)
  const runner = { baseColor: '#4a3a33', borderColor: accent, accentColor: accent }
  return (
    <group position={[0, y + 0.01, 0]}>
      <Rug position={[0, 0, RING]} size={[long, 2]} seed={seed} {...runner} />
      <Rug position={[0, 0, -RING]} size={[long, 2]} seed={seed + 1} {...runner} />
      <Rug
        position={[RING, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        size={[short, 2]}
        seed={seed + 2}
        {...runner}
      />
      <Rug
        position={[-RING, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        size={[short, 2]}
        seed={seed + 3}
        {...runner}
      />
    </group>
  )
}

/** The plaza board: the hall's name and what each floor holds, facing the entrance (+x). */
function Directory({ position }: { position: Vec3 }) {
  const lines = [...FLOORS.keys()].reverse()
  const m = useMaterials({
    post: { color: '#3a2c1d', roughness: 0.8 },
    board: { color: '#2c2118', roughness: 0.7 },
  })
  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      {[-0.95, 0.95].map((x) => (
        <mesh key={x} material={m.post} castShadow position={[x, 0.9, -0.04]}>
          <boxGeometry args={[0.08, 1.8, 0.08]} />
        </mesh>
      ))}
      <mesh material={m.board} castShadow receiveShadow position={[0, 1.55, 0]}>
        <boxGeometry args={[2.2, 1.2, 0.06]} />
      </mesh>
      <Sign position={[0, 1.96, 0.04]} size={0.15} letterSpacing={0.04} color="#3df58a" glow>
        The Gallery
      </Sign>
      {lines.map((i, row) => (
        <Sign
          key={FLOORS[i].name}
          position={[0, 1.66 - row * 0.24, 0.04]}
          size={0.1}
          letterSpacing={0.02}
          color={FLOORS[i].accent}
        >
          {`${i === 0 ? 'G' : i}  ${FLOORS[i].name}`}
        </Sign>
      ))}
    </group>
  )
}

export default function GalleryHall({
  componentDocs,
  categories,
  onSelect,
}: {
  componentDocs: DocMeta[]
  /** Registry category per component, keyed by its registry name (e.g. `Bench`). */
  categories: Record<string, string>
  onSelect: (doc: DocMeta) => void
}) {
  const floors = useMemo(() => {
    const bySlug = new Map(componentDocs.map((d) => [d.component ?? '', d]))
    const grouped: Exhibit[][] = FLOORS.map(() => [])
    for (const name of Object.keys(registry)) {
      if (EXCLUDE.has(name)) continue
      const category = categories[name] ?? 'other'
      grouped[floorOf(category)].push({
        name,
        category,
        props: { ...PREVIEW[name]?.props, ...TUNE[name] },
        doc: bySlug.get(name.toLowerCase()),
      })
    }
    for (const list of grouped)
      list.sort((a, b) => rank(a.category) - rank(b.category) || a.name.localeCompare(b.name))
    return grouped
  }, [componentDocs, categories])

  const { side, floors: slots } = useMemo(() => layoutHall(floors.map((f) => f.length)), [floors])

  const half = side / 2
  const face = innerHalf(side) - 0.02
  const centerX = ENTRY_X - VESTIBULE - half
  const westX = centerX - half

  // Clerestory: two windows high on every wall, clear of the centered floor titles.
  const clerestory = [-1, 1].map((s) => ({
    offset: s * (half - 6),
    width: 6,
    height: 0.9,
    sill: 3.2,
  }))
  const wallsFor = (ground: boolean): LevelWalls => {
    const sideWall = { openings: ground ? [DOOR, ...clerestory] : clerestory }
    return {
      front: { openings: clerestory },
      back: { openings: clerestory },
      left: sideWall,
      right: sideWall,
    }
  }

  // Flight A rises from the ground to the first floor's north edge, at x = -offset;
  // flight B from there to the second floor's south edge, at x = +offset.
  const flightGap = (x: number): [number, number] => [
    x - FLIGHT.width / 2 - 0.1,
    x + FLIGHT.width / 2 + 0.1,
  ]

  return (
    <group>
      {/* the vestibule between the library's doorway and the hall */}
      <Floor
        position={[ENTRY_X - VESTIBULE / 2, 0, 0]}
        size={[VESTIBULE, DOOR.width + 0.4]}
        color={FLOOR_COLOR}
      />
      {[-1, 1].map((s) => (
        <Wall
          key={s}
          position={[ENTRY_X - VESTIBULE / 2, 0, s * (DOOR.width / 2 + 0.1)]}
          width={VESTIBULE}
          height={DOOR.height + 0.4}
        />
      ))}

      <group position={[centerX, 0, 0]}>
        {/* three storeys; every floor above the ground is cut by the atrium */}
        {FLOORS.map((floor, i) => (
          <Level
            key={floor.name}
            position={[0, i * STOREY, 0]}
            size={[side, side]}
            height={STOREY}
            walls={wallsFor(i === 0)}
            floor={{ color: FLOOR_COLOR, ...(i > 0 && { opening: { width: VOID, depth: VOID } }) }}
          />
        ))}

        {/* the scissor stair across the atrium */}
        <Staircase
          position={[-FLIGHT.offset, 0, -VOID / 2]}
          form="floating"
          steps={FLIGHT.steps}
          totalHeight={STOREY}
          width={FLIGHT.width}
          depth={VOID}
          color="#5a4632"
        />
        <Staircase
          position={[FLIGHT.offset, STOREY, VOID / 2]}
          rotation={[0, Math.PI, 0]}
          form="floating"
          steps={FLIGHT.steps}
          totalHeight={STOREY}
          width={FLIGHT.width}
          depth={VOID}
          color="#5a4632"
        />
        <Balustrade
          y={STOREY}
          northGaps={[flightGap(-FLIGHT.offset), flightGap(FLIGHT.offset)]}
          southGaps={[]}
        />
        <Balustrade y={2 * STOREY} northGaps={[]} southGaps={[flightGap(FLIGHT.offset)]} />

        {/* the plaza under the atrium */}
        <Rug position={[2.5, 0.01, 0]} size={[5, 8]} seed={21} />
        <Directory position={[4.6, 0, -2.6]} />
        <Bench position={[4.4, 0, 3]} rotation={[0, -Math.PI / 2, 0]} seed={5} />
        <Bench position={[-4.4, 0, 3]} rotation={[0, Math.PI / 2, 0]} seed={6} />

        {/* wayfinding: each floor's name where you arrive on it, and the way back */}
        {FLOORS.map((floor, i) => {
          const wall: { position: Vec3; rotation: Vec3 } =
            i === 0
              ? { position: [-face, 3.75, 0], rotation: [0, Math.PI / 2, 0] }
              : i % 2 === 1
                ? { position: [0, i * STOREY + 3.75, face], rotation: [0, Math.PI, 0] }
                : { position: [0, i * STOREY + 3.75, -face], rotation: [0, 0, 0] }
          return (
            <Sign
              key={floor.name}
              {...wall}
              size={0.42}
              letterSpacing={0.06}
              color={floor.accent}
              glow
            >
              {floor.name}
            </Sign>
          )
        })}
        <Sign
          position={[face, 3.35, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          size={0.13}
          letterSpacing={0.02}
          color="#e3cd96"
        >
          ← Library
        </Sign>

        {/* each floor's runner in its accent */}
        {FLOORS.map((floor, i) => (
          <RingRug key={floor.name} y={i * STOREY} accent={floor.accent} seed={30 + i * 4} />
        ))}

        {/* light: pendants under the slabs above the ground and first floors, lamps on the
            open top floor; one per ring side */}
        {[0, 1].flatMap((i) =>
          [
            [0, RING + 2],
            [0, -(RING + 2)],
            [RING + 2, 0],
            [-(RING + 2), 0],
          ].map(([x, z]) => (
            <CeilingLight
              key={`pendant-${i}-${x}-${z}`}
              position={[x, (i + 1) * STOREY - 0.2, z]}
              kind="pendant"
              drop={1.2}
              intensity={22}
              seed={i + 3}
            />
          )),
        )}
        {[
          [RING + 1, RING + 1],
          [-(RING + 1), RING + 1],
          [RING + 1, -(RING + 1)],
          [-(RING + 1), -(RING + 1)],
        ].map(([x, z]) => (
          <Lamp key={`lamp-${x}-${z}`} position={[x, 2 * STOREY, z]} />
        ))}

        {/* the exhibits, floor by floor */}
        {floors.map((list, f) =>
          list.map((exhibit, i) => {
            const slot = slots[f][i]
            const opensSection =
              FLOORS[f].categories.length > 1 &&
              (i === 0 || list[i - 1].category !== exhibit.category)
            return (
              <ExhibitStand
                key={exhibit.name}
                exhibit={exhibit}
                position={[slot.x, f * STOREY, slot.z]}
                rotation={slot.rotation}
                accent={FLOORS[f].accent}
                section={opensSection ? title(exhibit.category) : undefined}
                onSelect={onSelect}
              />
            )
          }),
        )}
        {/* the miniatures, in a paused physics world of their own: on display, not in play */}
        <Physics paused>
          {floors.map((list, f) =>
            list.map((exhibit, i) => (
              <ExhibitMini
                key={exhibit.name}
                exhibit={exhibit}
                position={[slots[f][i].x, f * STOREY, slots[f][i].z]}
                rotation={slots[f][i].rotation}
              />
            )),
          )}
        </Physics>
      </group>

      {/* the grounds: a moonlit lawn wrapping the hall (stopping at the library's wall), a pond
          beyond the trees to the north, rocks to the south. A hair below the floors so coplanar
          slabs never z-fight. */}
      <Floor
        position={[(ENTRY_X + westX - 16) / 2, -0.01, 0]}
        size={[ENTRY_X - westX + 16, side + 44]}
        color="#2e4234"
      />
      <Lake size={[9, 7]} position={[centerX - 4, 0, half + 16]} />
      {[0.05, 0.2, 0.36, 0.52, 0.7, 0.88].flatMap((f, i) =>
        [1, -1].map((s) => (
          <Trees
            key={`tree-${f}-${s}`}
            position={[ENTRY_X - 2 - f * (side + 8), 0, s * (half + 5 + ((i * 5) % 9))]}
            seed={i * 2 + (s > 0 ? 4 : 5)}
          />
        )),
      )}
      <Rocks position={[centerX + 6, 0, -(half + 7)]} seed={11} />
      <Rocks position={[centerX - 9, 0, half + 13]} seed={12} />

      {/* the show home: a walkable House composite past the west doorway — step out of the
          hall, in through its front door, and up the stairs */}
      <WorldNodes
        nodes={[
          {
            type: 'House',
            props: { position: [westX - 6.5, 0, 0], rotation: [0, Math.PI / 2, 0], seed: 3 },
          },
        ]}
        registry={registry}
      />
    </group>
  )
}
