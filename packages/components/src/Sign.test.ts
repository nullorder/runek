import { lastResortFont, readCoverage } from '@runek/core'
// @ts-expect-error troika-three-text ships no types
import typrFactory from 'troika-three-text/libs/typr.factory.js'
import { beforeAll, describe, expect, it } from 'vitest'

interface TyprFont {
  maxp: { numGlyphs: number }
  hmtx: { aWidth: number[] }
}
interface Typr {
  parse(buffer: ArrayBuffer): TyprFont[]
  U: {
    codeToGlyph(font: TyprFont, code: number): number
    glyphToPath(font: TyprFont, glyph: number): { cmds: string[]; crds: number[] }
  }
}

// Read the last-resort face with the parser troika itself runs, so a change its parser can't
// follow fails here rather than as a hung Sign or a CDN request in a browser.
let typr: Typr
let font: TyprFont
let bytes: Uint8Array

beforeAll(() => {
  const g = globalThis as { self?: unknown }
  g.self ??= globalThis
  typr = (typrFactory as () => Typr)()
  bytes = Uint8Array.from(atob(lastResortFont().split(',')[1]), (ch) => ch.charCodeAt(0))
  font = typr.parse(bytes.buffer as ArrayBuffer)[0]
})

const glyph = (code: number) => typr.U.codeToGlyph(font, code)
const drawn = (code: number) => typr.U.glyphToPath(font, glyph(code)).cmds.length > 0
const advance = (code: number) => font.hmtx.aWidth[glyph(code)]

describe('last-resort font (#66)', () => {
  it('claims every code point, with a glyph the font has', () => {
    for (let code = 0; code <= 0x10ffff; code += 997) {
      expect(glyph(code)).toBeGreaterThan(0)
      expect(glyph(code)).toBeLessThan(font.maxp.numGlyphs)
    }
    for (const code of [0, 0xd800, 0xfffd, 0xe0100, 0xf0000, 0x10ffff]) {
      expect(glyph(code)).toBeGreaterThan(0)
    }
  })

  it('draws a box with an advance for printable characters', () => {
    for (const code of [0x41, 0x2192, 0x4eac, 0x4ead, 0x1f600, 0x10ffff]) {
      expect(drawn(code)).toBe(true)
      expect(advance(code)).toBe(600)
    }
  })

  it('draws spaces blank, and joiners and selectors blank at zero width', () => {
    for (const code of [0x20, 0x3000, 0x2003]) {
      expect(drawn(code)).toBe(false)
      expect(advance(code)).toBe(600)
    }
    for (const code of [0x00, 0x200d, 0xfe0f, 0xe0067, 0xe01ef]) {
      expect(drawn(code)).toBe(false)
      expect(advance(code)).toBe(0)
    }
  })

  it('reads back as covering everything', async () => {
    expect(await readCoverage(bytes)).toEqual([[0, 0x10ffff]])
  })
})
