import {
  pick,
  range,
  rng,
  sub,
  useMaterial,
  useMaterials,
  useWorld,
  type WorldComponentProps,
} from '@runek/core'
import { useMemo } from 'react'
import { DoubleSide, LatheGeometry, Vector2 } from 'three'

/** One piece, or a whole place `setting` (a plate, a glass, a knife, and a fork). */
export type TablewareKind = 'plate' | 'bowl' | 'glass' | 'cup' | 'jug' | 'setting'

export interface TablewareProps extends WorldComponentProps {
  /** Which piece; a plate by default. */
  kind?: TablewareKind
  /** Scale on the piece's true size (a 26 cm plate, an 11 cm glass, a 23 cm jug). */
  size?: number
  /** Plates or bowls stacked on each other. */
  stack?: number
  /** How full a glass, cup, or jug is, 0 to 1. Seeded when unset. */
  fill?: number
  /** The drink: water by default. */
  drinkColor?: string
  /** Glaze for plates, bowls, and cups. Seeded (mostly white) when unset. */
  color?: string
  /** Glass for glasses and the jug. */
  glassColor?: string
}

type Profile = [number, number][]

// Closed outlines in meters, (radius, height), from the axis at the foot round to the axis on top.
// `inner` is the cavity wall from the bottom up, which the drink fills.
const SHAPES: Record<Exclude<TablewareKind, 'setting'>, { outline: Profile; inner?: Profile }> = {
  plate: {
    outline: [
      [0, 0],
      [0.08, 0],
      [0.085, 0.006],
      [0.13, 0.02],
      [0.127, 0.024],
      [0.082, 0.01],
      [0, 0.01],
    ],
  },
  bowl: {
    outline: [
      [0, 0],
      [0.035, 0],
      [0.04, 0.008],
      [0.075, 0.05],
      [0.08, 0.07],
      [0.075, 0.07],
      [0.07, 0.052],
      [0.035, 0.012],
      [0, 0.012],
    ],
  },
  glass: {
    outline: [
      [0, 0],
      [0.03, 0],
      [0.036, 0.11],
      [0.033, 0.11],
      [0.027, 0.008],
      [0, 0.008],
    ],
    inner: [
      [0.027, 0.008],
      [0.033, 0.11],
    ],
  },
  cup: {
    outline: [
      [0, 0],
      [0.038, 0],
      [0.041, 0.09],
      [0.037, 0.09],
      [0.034, 0.008],
      [0, 0.008],
    ],
    inner: [
      [0.034, 0.008],
      [0.037, 0.09],
    ],
  },
  jug: {
    outline: [
      [0, 0],
      [0.058, 0],
      [0.068, 0.05],
      [0.064, 0.14],
      [0.052, 0.2],
      [0.058, 0.23],
      [0.054, 0.23],
      [0.048, 0.2],
      [0.06, 0.14],
      [0.064, 0.05],
      [0.055, 0.006],
      [0, 0.006],
    ],
    inner: [
      [0.055, 0.006],
      [0.064, 0.05],
      [0.06, 0.14],
      [0.048, 0.2],
      [0.054, 0.23],
    ],
  },
}

const GLAZES = ['#f4f1ea', '#f4f1ea', '#ece6d8', '#dfe8ee', '#2f4a6b', '#c96f4a', '#3f6b52']
const SILVER = '#c8ccd2'

function lathe(points: Profile, k: number) {
  return new LatheGeometry(
    points.map(([r, y]) => new Vector2(r * k, y * k)),
    28,
  )
}

/** The drink: the cavity's wall cut at the fill line, closed to the axis top and bottom. */
function liquid(inner: Profile, fill: number, k: number) {
  const top = inner[0][1] + (inner[inner.length - 1][1] - inner[0][1]) * fill * 0.92
  const pts: Profile = [[0, inner[0][1]]]
  for (let i = 0; i < inner.length; i++) {
    const [r, y] = inner[i]
    if (y <= top) {
      pts.push([r * 0.97, y])
      continue
    }
    const [r0, y0] = inner[i - 1]
    pts.push([(r0 + ((r - r0) * (top - y0)) / (y - y0)) * 0.97, top])
    break
  }
  if (pts[pts.length - 1][1] < top) pts.push([pts[pts.length - 1][0], top])
  pts.push([0, top])
  return lathe(pts, k)
}

function Piece({
  kind,
  k,
  glaze,
  glass,
  drink,
  fill,
  stack = 1,
}: {
  kind: Exclude<TablewareKind, 'setting'>
  k: number
  glaze: string
  glass: string
  drink: string
  fill: number
  stack?: number
}) {
  const shape = SHAPES[kind]
  const body = useMemo(() => lathe(shape.outline, k), [shape, k])
  const water = useMemo(
    () => (shape.inner && fill > 0 ? liquid(shape.inner, fill, k) : null),
    [shape, fill, k],
  )
  const glassy = kind === 'glass' || kind === 'jug'
  const m = useMaterials({
    body: glassy
      ? {
          kind: 'physical',
          color: glass,
          roughness: 0.05,
          metalness: 0,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
          side: DoubleSide,
        }
      : { color: glaze, roughness: 0.25, side: DoubleSide },
    drink: { color: drink, roughness: 0.1, transparent: true, opacity: 0.75 },
  })
  const step = (kind === 'bowl' ? 0.03 : 0.012) * k
  const layers = kind === 'plate' || kind === 'bowl' ? Math.max(1, Math.round(stack)) : 1

  return (
    <group>
      {Array.from({ length: layers }, (_, i) => (
        <mesh key={i} material={m.body} geometry={body} position={[0, i * step, 0]} castShadow />
      ))}
      {water && <mesh material={m.drink} geometry={water} renderOrder={-1} />}
      {(kind === 'cup' || kind === 'jug') && (
        // the handle: a half ring on the +X side
        <mesh
          material={m.body}
          position={[(kind === 'cup' ? 0.04 : 0.06) * k, (kind === 'cup' ? 0.048 : 0.13) * k, 0]}
          rotation={[0, 0, -Math.PI / 2]}
          castShadow
        >
          <torusGeometry args={[(kind === 'cup' ? 0.022 : 0.045) * k, 0.005 * k, 8, 16, Math.PI]} />
        </mesh>
      )}
    </group>
  )
}

/**
 * Tableware to set a `Table` or a `Counter`: a plate, a bowl, a glass, a cup, or a water jug,
 * each turned from a profile, or a whole place `setting`. Glasses, cups, and the jug hold a drink
 * to a `fill` line. Its origin is the foot, so it sits on the top it is placed on; a setting faces
 * the diner along local +Z. Plates and bowls stack. Decorative: no collider.
 */
export function Tableware({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  kind = 'plate',
  size = 1,
  stack = 1,
  fill,
  drinkColor = '#9fd3e8',
  color,
  glassColor = '#d8eef6',
}: TablewareProps) {
  const { unit } = useWorld()
  const k = size * unit

  const look = useMemo(() => {
    const r = rng(sub(seed, 0))
    return { glaze: color ?? pick(r, GLAZES), fill: fill ?? range(r, 0.35, 0.85) }
  }, [seed, color, fill])

  const silver = useMaterial({ color: SILVER, metalness: 0.4, roughness: 0.3 })
  const shared = { k, glaze: look.glaze, glass: glassColor, drink: drinkColor, fill: look.fill }

  if (kind !== 'setting') {
    return (
      <group position={position} rotation={rotation}>
        <Piece kind={kind} stack={stack} {...shared} />
      </group>
    )
  }

  const flat = 0.004 * k
  return (
    <group position={position} rotation={rotation}>
      <Piece kind="plate" {...shared} />
      <group position={[0.15 * k, 0, -0.14 * k]}>
        <Piece kind="glass" {...shared} />
      </group>
      {/* knife on the right: the handle toward the diner, the blade away */}
      <group position={[0.165 * k, flat / 2, 0]}>
        <mesh material={silver} position={[0, 0, 0.05 * k]} castShadow>
          <boxGeometry args={[0.014 * k, flat, 0.1 * k]} />
        </mesh>
        <mesh material={silver} position={[-0.002 * k, 0, -0.055 * k]} castShadow>
          <boxGeometry args={[0.02 * k, flat * 0.6, 0.11 * k]} />
        </mesh>
      </group>
      {/* fork on the left: a handle, a neck, four tines */}
      <group position={[-0.165 * k, flat / 2, 0]}>
        <mesh material={silver} position={[0, 0, 0.055 * k]} castShadow>
          <boxGeometry args={[0.012 * k, flat, 0.1 * k]} />
        </mesh>
        <mesh material={silver} position={[0, 0, -0.015 * k]}>
          <boxGeometry args={[0.022 * k, flat, 0.04 * k]} />
        </mesh>
        {[-1.5, -0.5, 0.5, 1.5].map((t) => (
          <mesh key={t} material={silver} position={[t * 0.0055 * k, 0, -0.06 * k]}>
            <boxGeometry args={[0.003 * k, flat, 0.05 * k]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
