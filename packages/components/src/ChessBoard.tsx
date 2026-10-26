import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { int, rng, sub, useMaterials, useWorld, type WorldComponentProps } from '@runek/core'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  type BufferGeometry,
  type InstancedMesh,
  LatheGeometry,
  type Material,
  Matrix4,
  Quaternion,
  Vector2,
  Vector3,
} from 'three'

export interface ChessBoardProps extends WorldComponentProps {
  /** A position in Forsyth-Edwards Notation (the placement field is enough), or `start`.
   *  Unset, the seed plays out a mid-game: some pieces taken, pawns pushed, pieces developed. */
  fen?: string
  /** Board width across its frame, in units. */
  size?: number
  /** Stand it on its own pedestal table; otherwise it lies on whatever top it is placed on. */
  table?: boolean
  /** The light squares. */
  lightSquare?: string
  /** The dark squares (a1 is dark). */
  darkSquare?: string
  /** The frame and the pedestal; defaults to the palette's `wood`. */
  frameColor?: string
  /** White's pieces. */
  whiteColor?: string
  /** Black's pieces. */
  blackColor?: string
}

type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'

export interface ChessPiece {
  type: PieceType
  white: boolean
  file: number
  rank: number
}

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'
const TYPES: PieceType[] = ['p', 'n', 'b', 'r', 'q', 'k']

/** The placement field of a FEN, or null when it does not describe an 8 by 8 board. */
function parseFen(fen: string): ChessPiece[] | null {
  const rows = fen.trim().split(/\s+/)[0]?.split('/') ?? []
  if (rows.length !== 8) return null
  const pieces: ChessPiece[] = []
  for (let i = 0; i < 8; i++) {
    let file = 0
    for (const ch of rows[i]) {
      if (/[1-8]/.test(ch)) {
        file += Number(ch)
        continue
      }
      const type = ch.toLowerCase() as PieceType
      if (!TYPES.includes(type) || file > 7) return null
      pieces.push({ type, white: ch !== type, file, rank: 7 - i })
      file++
    }
    if (file !== 8) return null
  }
  return pieces
}

/** A plausible middle game from a seed: captures, pushed pawns, developed pieces. */
function midgame(seed: number): ChessPiece[] {
  const r = rng(sub(seed, 0))
  const pieces = parseFen(START) ?? []
  const taken = int(r, 4, 14)
  for (let i = 0; i < taken; i++) {
    const options = pieces.filter((p) => p.type !== 'k')
    pieces.splice(pieces.indexOf(options[Math.floor(r() * options.length)]), 1)
  }
  const free = (file: number, rank: number) =>
    !pieces.some((p) => p.file === file && p.rank === rank)
  for (const p of pieces) {
    if (p.type === 'p') {
      const dir = p.white ? 1 : -1
      const steps = r() < 0.6 ? int(r, 1, 3) : 0
      for (let s = 0; s < steps && free(p.file, p.rank + dir); s++) p.rank += dir
    } else if (p.type !== 'k' && r() < 0.55) {
      const file = int(r, 0, 7)
      const rank = p.white ? int(r, 1, 4) : int(r, 3, 6)
      if (free(file, rank)) Object.assign(p, { file, rank })
    }
  }
  return pieces
}

/** The pieces on the board: from `fen` (`start`, or a placement the board falls back to the
 *  start from when it cannot read), or a seeded mid-game when `fen` is unset. Files and ranks
 *  count from 0 (a1 is file 0, rank 0). */
export function chessPieces(fen: string | undefined, seed: number): ChessPiece[] {
  if (!fen) return midgame(seed)
  return parseFen(fen === 'start' ? START : fen) ?? parseFen(START) ?? []
}

// Turned profiles in square widths, (radius, height), foot to crown.
const PROFILES: Record<PieceType, [number, number][]> = {
  p: [
    [0, 0],
    [0.32, 0],
    [0.32, 0.08],
    [0.24, 0.14],
    [0.16, 0.2],
    [0.11, 0.5],
    [0.18, 0.56],
    [0.1, 0.6],
    [0.16, 0.7],
    [0.17, 0.8],
    [0.12, 0.92],
    [0, 0.95],
  ],
  r: [
    [0, 0],
    [0.36, 0],
    [0.36, 0.08],
    [0.28, 0.16],
    [0.22, 0.25],
    [0.2, 0.75],
    [0.27, 0.8],
    [0.27, 1.0],
    [0.2, 1.0],
    [0.2, 0.94],
    [0, 0.94],
  ],
  b: [
    [0, 0],
    [0.35, 0],
    [0.35, 0.08],
    [0.26, 0.15],
    [0.15, 0.25],
    [0.11, 0.75],
    [0.2, 0.8],
    [0.1, 0.86],
    [0.16, 0.98],
    [0.14, 1.12],
    [0.05, 1.22],
    [0.06, 1.26],
    [0, 1.3],
  ],
  q: [
    [0, 0],
    [0.37, 0],
    [0.37, 0.08],
    [0.28, 0.16],
    [0.16, 0.28],
    [0.12, 0.95],
    [0.22, 1.0],
    [0.12, 1.06],
    [0.2, 1.32],
    [0.12, 1.36],
    [0.07, 1.4],
    [0.07, 1.44],
    [0, 1.48],
  ],
  k: [
    [0, 0],
    [0.38, 0],
    [0.38, 0.08],
    [0.29, 0.16],
    [0.17, 0.3],
    [0.13, 1.0],
    [0.23, 1.05],
    [0.13, 1.1],
    [0.2, 1.4],
    [0.1, 1.46],
    [0, 1.48],
  ],
  n: [
    [0, 0],
    [0.35, 0],
    [0.35, 0.08],
    [0.26, 0.16],
    [0.22, 0.3],
    [0, 0.3],
  ],
}

interface Part {
  geometry: BufferGeometry
  local: Matrix4
}

const box = (w: number, h: number, d: number, pos: Vector3, tilt = 0) => ({
  geometry: new BoxGeometry(w, h, d),
  local: new Matrix4().compose(
    pos,
    new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), tilt),
    new Vector3(1, 1, 1),
  ),
})

/** Each piece as one or more parts in square widths: a turned body, plus the knight's head and
 *  the king's cross. The knight faces local +Z. */
function pieceParts(): Record<PieceType, Part[]> {
  const out = {} as Record<PieceType, Part[]>
  for (const t of TYPES) {
    out[t] = [
      {
        geometry: new LatheGeometry(
          PROFILES[t].map(([x, y]) => new Vector2(x, y)),
          t === 'r' ? 12 : 18,
        ),
        local: new Matrix4(),
      },
    ]
  }
  out.k.push(
    box(0.07, 0.24, 0.07, new Vector3(0, 1.58, 0)),
    box(0.2, 0.07, 0.07, new Vector3(0, 1.6, 0)),
  )
  out.n.push(
    box(0.26, 0.6, 0.3, new Vector3(0, 0.58, -0.04), -0.2),
    box(0.22, 0.2, 0.44, new Vector3(0, 0.88, 0.08), 0.35),
    box(0.16, 0.12, 0.08, new Vector3(0, 1.0, -0.1)),
  )
  return out
}

function Instanced({
  geometry,
  matrices,
  material,
}: {
  geometry: BufferGeometry
  matrices: Matrix4[]
  material: Material
}) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    matrices.forEach((m, i) => {
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [matrices])
  return (
    <instancedMesh
      key={matrices.length}
      ref={ref}
      args={[geometry, undefined, matrices.length]}
      material={material}
      castShadow
      receiveShadow
    />
  )
}

const UP = new Vector3(0, 1, 0)

/**
 * A chess board with a full set of turned pieces, set from a position in FEN or played out from
 * the seed into a mid-game. Files run along local X (a to h) and white sits at local +Z. It lies
 * on whatever it is placed on (its origin is the board's underside), or stands on its own
 * pedestal table with `table`. Squares and pieces are instanced: a few draw calls for the set.
 * With a table it has one cuboid collider; a bare board has none.
 */
export function ChessBoard({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  fen,
  size = 0.45,
  table = false,
  lightSquare = '#e8d7b0',
  darkSquare = '#6b4a2b',
  frameColor,
  whiteColor = '#efe6d2',
  blackColor = '#2a2522',
}: ChessBoardProps) {
  const { unit, palette } = useWorld()
  const wood = frameColor ?? palette.wood
  const B = size * unit
  const sq = (B * 0.9) / 8
  const thick = 0.022 * unit
  const tableH = 0.72 * unit
  const base = table ? tableH : 0
  const m = useMaterials({
    light: { color: lightSquare, roughness: 0.35 },
    dark: { color: darkSquare, roughness: 0.35 },
    white: { color: whiteColor, roughness: 0.35 },
    black: { color: blackColor, roughness: 0.35 },
    board: { color: wood, roughness: 0.5 },
    table: { color: wood, roughness: 0.55 },
  })

  const pieces = useMemo(() => chessPieces(fen, seed), [fen, seed])

  const parts = useMemo(pieceParts, [])
  const squareGeometry = useMemo(() => new BoxGeometry(sq, 0.001 * unit, sq), [sq, unit])

  const squares = useMemo(() => {
    const light: Matrix4[] = []
    const dark: Matrix4[] = []
    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        const m = new Matrix4().makeTranslation((f - 3.5) * sq, 0, (3.5 - r) * sq)
        // a1 is a dark square
        ;((f + r) % 2 === 0 ? dark : light).push(m)
      }
    }
    return { light, dark }
  }, [sq])

  const sets = useMemo(() => {
    const out: { key: string; geometry: BufferGeometry; matrices: Matrix4[]; white: boolean }[] = []
    const scale = new Vector3(sq, sq, sq)
    for (const t of TYPES) {
      for (const white of [true, false]) {
        const mine = pieces.filter((p) => p.type === t && p.white === white)
        if (!mine.length) continue
        const placed = mine.map((p) =>
          new Matrix4().compose(
            new Vector3((p.file - 3.5) * sq, 0, (3.5 - p.rank) * sq),
            new Quaternion().setFromAxisAngle(UP, white ? Math.PI : 0),
            scale,
          ),
        )
        parts[t].forEach((part, i) => {
          out.push({
            key: `${t}${white ? 'w' : 'b'}${i}`,
            geometry: part.geometry,
            matrices: placed.map((m) => m.clone().multiply(part.local)),
            white,
          })
        })
      }
    }
    return out
  }, [pieces, parts, sq])

  const board = (
    <group position={[0, base, 0]}>
      <mesh material={m.board} position={[0, thick / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[B, thick, B]} />
      </mesh>
      <group position={[0, thick + 0.0005 * unit, 0]}>
        {[
          { list: squares.light, color: lightSquare, material: m.light },
          { list: squares.dark, color: darkSquare, material: m.dark },
        ].map(({ list, color, material }) => (
          <Instanced key={color} geometry={squareGeometry} matrices={list} material={material} />
        ))}
      </group>
      <group position={[0, thick + 0.001 * unit, 0]}>
        {sets.map((s) => (
          <Instanced
            key={s.key}
            geometry={s.geometry}
            matrices={s.matrices}
            material={s.white ? m.white : m.black}
          />
        ))}
      </group>
    </group>
  )

  if (!table) {
    return (
      <group position={position} rotation={rotation}>
        {board}
      </group>
    )
  }

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[B * 0.6, tableH / 2, B * 0.6]} position={[0, tableH / 2, 0]} />
      <mesh material={m.table} position={[0, tableH - 0.015 * unit, 0]} castShadow receiveShadow>
        <boxGeometry args={[B * 1.2, 0.03 * unit, B * 1.2]} />
      </mesh>
      <mesh material={m.table} position={[0, tableH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.04 * unit, 0.05 * unit, tableH - 0.03 * unit, 14]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          material={m.table}
          position={[0, 0.03 * unit, 0]}
          rotation={[0, (i * Math.PI * 2) / 3, 0]}
          castShadow
        >
          <boxGeometry args={[0.05 * unit, 0.05 * unit, B * 0.85]} />
        </mesh>
      ))}
      {board}
    </RigidBody>
  )
}
