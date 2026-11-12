/**
 * A font built in code that claims every Unicode code point, so a text renderer given it as the
 * face under every text never finds a character uncovered. troika-three-text looks any character
 * its fonts lack up through a font index on a public CDN (and falls back to that CDN when given
 * another index location), which a world must never do (CONTRACT §4). Set as troika's default font
 * (`configureTextBuilder({ defaultFontURL })`, which `Sign` does), troika never asks.
 *
 * What it draws: a hollow box for anything printable, nothing at zero width for controls, joiners
 * and variation selectors (so an emoji's `U+FE0F` adds no box of its own), and a blank advance for
 * spaces. It is a minimal TrueType made for troika's parser only (no names, no hinting, no trailing
 * side bearings), not a font for the page.
 */

const UNITS = 1000
const ADVANCE = 600
const ASCENT = 800
const DESCENT = -200

/** Code points drawn as nothing at zero width: controls, format characters, selectors, tags. */
const ZERO_WIDTH: [number, number][] = [
  [0x00, 0x08],
  [0x0e, 0x1f],
  [0x7f, 0x84],
  [0x86, 0x9f],
  [0xad, 0xad],
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2060, 0x2064],
  [0x2066, 0x206f],
  [0xfe00, 0xfe0f],
  [0xfeff, 0xfeff],
  [0xfff9, 0xfffb],
  [0xe0000, 0xe007f],
  [0xe0100, 0xe01ef],
]

/** Code points drawn as a blank advance. */
const SPACES: [number, number][] = [
  [0x09, 0x0d],
  [0x20, 0x20],
  [0x85, 0x85],
  [0xa0, 0xa0],
  [0x1680, 0x1680],
  [0x2000, 0x200a],
  [0x2028, 0x2029],
  [0x202f, 0x202f],
  [0x205f, 0x205f],
  [0x3000, 0x3000],
]

const inRanges = (code: number, ranges: [number, number][]) =>
  ranges.some(([a, b]) => code >= a && code <= b)

/** Whether the last-resort font draws `code` as nothing (a space, a control, a joiner, a
 *  selector) rather than a box. */
export function drawsBlank(code: number): boolean {
  return inRanges(code, ZERO_WIDTH) || inRanges(code, SPACES)
}

const MAX_CODE = 0x10ffff
// Box glyphs in a row. The format 12 cmap maps a run of codes to a run of glyphs, so every code
// in a run needs a glyph of its own: a longer run means fewer cmap groups but a longer loca table.
const BOX_RUN = 2048

/** A hollow box: outer contour clockwise, inner counter-clockwise, all points on the curve. */
function boxGlyph(): number[] {
  const outer = [
    [50, 0],
    [50, 700],
    [550, 700],
    [550, 0],
  ]
  const inner = [
    [100, 50],
    [500, 50],
    [500, 650],
    [100, 650],
  ]
  const points = [...outer, ...inner]
  const out = new Writer()
  out.i16(2).i16(50).i16(0).i16(550).i16(700)
  out.u16(3).u16(7).u16(0)
  for (let i = 0; i < points.length; i++) out.u8(1)
  let prev = 0
  for (const [x] of points) {
    out.i16(x - prev)
    prev = x
  }
  prev = 0
  for (const [, y] of points) {
    out.i16(y - prev)
    prev = y
  }
  return out.bytes
}

class Writer {
  bytes: number[] = []
  u8(v: number) {
    this.bytes.push(v & 0xff)
    return this
  }
  u16(v: number) {
    return this.u8(v >> 8).u8(v)
  }
  i16(v: number) {
    return this.u16(v < 0 ? v + 0x10000 : v)
  }
  u32(v: number) {
    return this.u16(Math.floor(v / 0x10000)).u16(v)
  }
  tag(s: string) {
    for (const ch of s) this.u8(ch.charCodeAt(0))
    return this
  }
  pad() {
    while (this.bytes.length % 4) this.u8(0)
    return this
  }
}

interface Group {
  start: number
  end: number
  glyph: number
}

/** The font's bytes. */
export function lastResortFontBytes(): Uint8Array {
  // Glyph order: 0 the missing-glyph box, then one empty glyph per code of the longest zero-width
  // run (a run maps to consecutive glyphs), then one per code of the longest space run, then the
  // boxes. Advances are explicit up to the first space glyph; every glyph after it shares its
  // advance, which is also the boxes'.
  const runLength = (ranges: [number, number][]) => Math.max(...ranges.map(([a, b]) => b - a + 1))
  const zeroFirst = 1
  const spaceFirst = zeroFirst + runLength(ZERO_WIDTH)
  const boxFirst = spaceFirst + runLength(SPACES)
  const numGlyphs = boxFirst + BOX_RUN
  const metrics = spaceFirst + 1

  const special: Group[] = [
    ...ZERO_WIDTH.map(([start, end]) => ({ start, end, glyph: zeroFirst })),
    ...SPACES.map(([start, end]) => ({ start, end, glyph: spaceFirst })),
  ].sort((a, b) => a.start - b.start)

  const groups: Group[] = []
  const boxes = (from: number, to: number) => {
    for (let start = from; start <= to; start += BOX_RUN) {
      groups.push({ start, end: Math.min(to, start + BOX_RUN - 1), glyph: boxFirst })
    }
  }
  let next = 0
  for (const group of special) {
    if (group.start > next) boxes(next, group.start - 1)
    groups.push(group)
    next = group.end + 1
  }
  boxes(next, MAX_CODE)

  const box = boxGlyph()
  const tables: Record<string, number[]> = {}

  const cmap = new Writer()
  cmap.u16(0).u16(1)
  cmap.u16(0).u16(4).u32(12)
  cmap
    .u16(12)
    .u16(0)
    .u32(16 + 12 * groups.length)
    .u32(0)
    .u32(groups.length)
  for (const g of groups) cmap.u32(g.start).u32(g.end).u32(g.glyph)
  tables.cmap = cmap.bytes

  // Two copies of the box: troika's parser treats a glyph whose loca entry equals the next one
  // as empty, so the boxes alternate between the copies.
  tables.glyf = [...box, ...box]
  const second = box.length / 2
  const loca = new Writer()
  for (let g = 0; g <= numGlyphs; g++) {
    if (g === 0) loca.u16(0)
    else if (g <= boxFirst) loca.u16(second)
    else loca.u16((g - boxFirst) % 2 === 1 ? 0 : second)
  }
  tables.loca = loca.bytes

  const hmtx = new Writer()
  for (let g = 0; g < metrics; g++) {
    const empty = g >= zeroFirst
    hmtx.u16(g >= zeroFirst && g < spaceFirst ? 0 : ADVANCE).i16(empty ? 0 : 50)
  }
  tables.hmtx = hmtx.bytes

  tables.head = new Writer()
    .u32(0x10000)
    .u32(0x10000)
    .u32(0)
    .u32(0x5f0f3cf5)
    .u16(0)
    .u16(UNITS)
    .u32(0)
    .u32(0)
    .u32(0)
    .u32(0)
    .i16(50)
    .i16(0)
    .i16(550)
    .i16(700)
    .u16(0)
    .u16(8)
    .i16(2)
    .i16(0)
    .i16(0).bytes

  tables.hhea = new Writer()
    .u32(0x10000)
    .i16(ASCENT)
    .i16(DESCENT)
    .i16(0)
    .u16(ADVANCE)
    .i16(0)
    .i16(50)
    .i16(550)
    .i16(1)
    .i16(0)
    .i16(0)
    .u32(0)
    .u32(0)
    .i16(0)
    .u16(metrics).bytes

  tables.maxp = new Writer().u32(0x5000).u16(numGlyphs).bytes

  const tags = Object.keys(tables).sort()
  const out = new Writer()
  const entrySelector = Math.floor(Math.log2(tags.length))
  const searchRange = 2 ** entrySelector * 16
  out
    .u32(0x10000)
    .u16(tags.length)
    .u16(searchRange)
    .u16(entrySelector)
    .u16(tags.length * 16 - searchRange)
  let offset = 12 + 16 * tags.length
  for (const tag of tags) {
    const length = tables[tag].length
    out.tag(tag).u32(0).u32(offset).u32(length)
    offset += Math.ceil(length / 4) * 4
  }
  for (const tag of tags) {
    for (const b of tables[tag]) out.u8(b)
    out.pad()
  }
  return Uint8Array.from(out.bytes)
}

let url: string | null = null

/** The last-resort font as a `data:` URI (built on first use). */
export function lastResortFont(): string {
  if (url) return url
  const bytes = lastResortFontBytes()
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  url = `data:font/ttf;base64,${btoa(binary)}`
  return url
}
