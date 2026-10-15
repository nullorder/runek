import { describe, expect, it } from 'vitest'
import { chessPieces } from './ChessBoard'

const at = (fen: string | undefined, seed = 1) =>
  chessPieces(fen, seed)
    .map((p) => `${p.white ? p.type.toUpperCase() : p.type}${'abcdefgh'[p.file]}${p.rank + 1}`)
    .sort()

describe('chessPieces', () => {
  it('reads a FEN, with or without the fields after the placement', () => {
    const fen = '4k3/8/8/3q4/8/8/8/R3K3 w Q - 0 1'
    expect(at(fen)).toEqual(['Ra1', 'Ke1', 'qd5', 'ke8'].sort())
    expect(at(fen.split(' ')[0])).toEqual(at(fen))
  })

  it('sets up the start for `start` and for a placement it cannot read', () => {
    expect(at('start')).toHaveLength(32)
    expect(at('8/8/8')).toEqual(at('start'))
    expect(at('9/8/8/8/8/8/8/8')).toEqual(at('start'))
    expect(at('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNX')).toEqual(at('start'))
  })

  it('plays a seeded mid-game: deterministic, kings kept, no two pieces on a square', () => {
    for (const seed of [1, 2, 3, 42]) {
      const pieces = at(undefined, seed)
      expect(pieces).toEqual(at(undefined, seed))
      expect(pieces.length).toBeLessThan(32)
      expect(pieces.filter((p) => /^k/.test(p))).toHaveLength(1)
      expect(pieces.filter((p) => /^K/.test(p))).toHaveLength(1)
      const squares = pieces.map((p) => p.slice(1))
      expect(new Set(squares).size).toBe(squares.length)
    }
    expect(at(undefined, 1)).not.toEqual(at(undefined, 2))
  })
})
