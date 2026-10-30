import {
  pick,
  type Rng,
  range,
  rng,
  useMaterial,
  useWorld,
  type WorldComponentProps,
} from '@runek/core'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, Euler, type InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three'

export interface NewspapersProps extends WorldComponentProps {
  /** Folded newspapers in the pile, 0 to 4. */
  papers?: number
  /** Magazines fanned beside it, 0 to 4. */
  magazines?: number
}

/** Magazine covers, shared with `MagazineRack`. */
export const COVERS = [
  '#d1495b',
  '#edae49',
  '#00798c',
  '#30638e',
  '#3c8d5a',
  '#8e4585',
  '#1b1b1d',
  '#f2efe8',
]
const NEWSPRINT = '#ece8dc'
const INK = '#26262a'
const COLUMN = '#aca89d'
const PHOTO = '#77736b'

/** One box of print: a matrix that places and sizes a unit cube, and its colour. */
export interface Sheet {
  matrix: Matrix4
  color: string
}

/** Sizes in meters, [width, thickness, depth]. */
export const PAPER: [number, number, number] = [0.29, 0.012, 0.38]
export const MAGAZINE: [number, number, number] = [0.21, 0.006, 0.28]

const LIFT = 0.0006

/** A box `w` by `h` by `d` sitting on `at`'s XZ plane, centred at (x, z) in its frame. */
function box(at: Matrix4, x: number, y: number, z: number, w: number, h: number, d: number) {
  return at
    .clone()
    .multiply(
      new Matrix4().compose(new Vector3(x, y + h / 2, z), new Quaternion(), new Vector3(w, h, d)),
    )
}

/**
 * A folded newspaper lying on the plane of `at`, in meters, its masthead toward -Z: newsprint
 * with a headline bar, a photo and columns of type printed on top.
 */
export function newspaper(at: Matrix4, next: Rng): Sheet[] {
  const [w, t, d] = PAPER
  const top = t + LIFT
  const out: Sheet[] = [{ matrix: box(at, 0, 0, 0, w, t, d), color: NEWSPRINT }]
  out.push({ matrix: box(at, 0, top, -d / 2 + 0.035, w * 0.86, 0.001, 0.03), color: INK })
  const cols = 4
  const colW = (w * 0.86) / cols
  const photo = Math.floor(next() * (cols - 1))
  for (let i = 0; i < cols; i++) {
    const x = -w * 0.43 + colW * (i + 0.5)
    if (i === photo || i === photo + 1) continue
    out.push({ matrix: box(at, x, top, 0.03, colW * 0.8, 0.001, d * 0.66), color: COLUMN })
  }
  const px = -w * 0.43 + colW * (photo + 1)
  out.push({ matrix: box(at, px, top, -0.02, colW * 1.85, 0.001, d * 0.3), color: PHOTO })
  out.push({ matrix: box(at, px, top, 0.12, colW * 1.85, 0.001, d * 0.24), color: COLUMN })
  return out
}

/**
 * A magazine lying on the plane of `at`, in meters, its masthead toward -Z: a seeded cover with
 * a masthead band, a cover picture and a cover line.
 */
export function magazine(at: Matrix4, next: Rng): Sheet[] {
  const [w, t, d] = MAGAZINE
  const top = t + LIFT
  const cover = pick(next, COVERS)
  const light = cover === '#f2efe8' || cover === '#edae49'
  const picture = pick(
    next,
    COVERS.filter((c) => c !== cover),
  )
  return [
    { matrix: box(at, 0, 0, 0, w, t, d), color: cover },
    {
      matrix: box(at, 0, top, -d / 2 + 0.028, w * 0.9, 0.001, 0.04),
      color: light ? INK : '#f7f4ee',
    },
    { matrix: box(at, 0.015, top, 0.02, w * 0.66, 0.001, d * 0.46), color: picture },
    {
      matrix: box(at, -0.03, top, d / 2 - 0.035, w * 0.6, 0.001, 0.016),
      color: light ? INK : '#f7f4ee',
    },
  ]
}

/** A frame at (x, y, z) in meters, scaled to world units, turned by `turn`. */
export function frame(u: number, x: number, y: number, z: number, turn: Euler = new Euler()) {
  return new Matrix4().compose(
    new Vector3(x * u, y * u, z * u),
    new Quaternion().setFromEuler(turn),
    new Vector3(u, u, u),
  )
}

/** Paper sheets drawn as one instanced box, each in its own colour: one material, one draw.
 *  They cast no shadow: paper this thin only shadows itself. */
export function Sheets({ sheets }: { sheets: Sheet[] }) {
  const ref = useRef<InstancedMesh>(null)
  const material = useMaterial({ color: '#ffffff', roughness: 0.8 })

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const c = new Color()
    sheets.forEach((s, i) => {
      mesh.setMatrixAt(i, s.matrix)
      mesh.setColorAt(i, c.set(s.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [sheets])

  if (!sheets.length) return null
  return (
    <instancedMesh
      key={sheets.length}
      ref={ref}
      args={[undefined, undefined, sheets.length]}
      material={material}
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  )
}

/**
 * The day's papers and a few magazines left on a coffee table or a counter: a pile of folded
 * newspapers, each with a headline bar, a photo and columns, and magazines fanned out beside
 * it. Its origin is on the top it lies on. Seeded: the covers and how squarely each one lies.
 * Drawn as one instanced mesh. Decorative: no collider.
 */
export function Newspapers({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  papers = 2,
  magazines = 2,
}: NewspapersProps) {
  const { unit: u } = useWorld()
  const nPapers = Math.max(0, Math.min(4, Math.round(papers)))
  const nMagazines = Math.max(0, Math.min(4, Math.round(magazines)))

  const sheets = useMemo(() => {
    const next = rng(seed)
    const out: Sheet[] = []
    const px = nMagazines ? -0.13 : 0
    let y = 0
    for (let i = 0; i < nPapers; i++) {
      const turn = new Euler(0, range(next, -0.12, 0.12), 0)
      out.push(
        ...newspaper(
          frame(u, px + range(next, -0.015, 0.015), y, range(next, -0.015, 0.015), turn),
          next,
        ),
      )
      y += PAPER[1] + 0.0025
    }
    const mx = nPapers ? 0.17 : 0
    y = 0
    for (let i = 0; i < nMagazines; i++) {
      const turn = new Euler(0, -0.25 + i * 0.28 + range(next, -0.06, 0.06), 0)
      out.push(...magazine(frame(u, mx + i * 0.025, y, i * 0.02, turn), next))
      y += MAGAZINE[1] + 0.0025
    }
    return out
  }, [seed, nPapers, nMagazines, u])

  return (
    <group position={position} rotation={rotation}>
      <Sheets sheets={sheets} />
    </group>
  )
}
