import { drawsBlank } from './last-resort.ts'

/** Code points as inclusive `[first, last]` ranges, sorted. */
export type CodeRanges = [number, number][]

/** The code points `DEFAULT_FONT` draws, as hex ranges. */
export const DEFAULT_FONT_COVERAGE =
  '20-7e,a0-a3,a5,a7-ab,ae-b0,b4,b6-b8,ba-bb,bf-107,10a-113,116-11b,11e-123,126-127,12a-12b,' +
  '12e-131,136-137,139-13e,141-148,150-155,158-15b,15e-161,164-165,16a-16b,16e-17e,218-21b,237,' +
  '2c6-2c7,2d8-2dd,300-304,306-308,30a-30c,326-328,1e80-1e85,1e9e,1ef2-1ef3,2013-2014,2018-201a,' +
  '201c-201e,2022,2026,2039-203a,20ac,2122,2212,2500-254b,2550-259f'

/** Hex ranges (`"20-7e,a0"`) as code ranges. */
export function parseCoverage(ranges: string): CodeRanges {
  return ranges.split(',').map((range) => {
    const [a, b = a] = range.split('-').map((n) => Number.parseInt(n, 16))
    return [a, b]
  })
}

/** Whether `ranges` holds `code`. */
export function covers(ranges: CodeRanges, code: number): boolean {
  let lo = 0
  let hi = ranges.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (code < ranges[mid][0]) hi = mid - 1
    else if (code > ranges[mid][1]) lo = mid + 1
    else return true
  }
  return false
}

let defaultRanges: CodeRanges | null = null

/** {@link DEFAULT_FONT_COVERAGE} as code ranges. */
export function defaultCoverage(): CodeRanges {
  defaultRanges ??= parseCoverage(DEFAULT_FONT_COVERAGE)
  return defaultRanges
}

/** The characters of `text` that draw as something: spaces, controls, joiners and variation
 *  selectors draw as nothing in any font, so they never count as missing. */
export function drawnCharacters(text: string): string[] {
  return [...text].filter((ch) => !drawsBlank(ch.codePointAt(0) ?? 0))
}

/**
 * The distinct characters in `text` that a font covering `coverage` doesn't draw, in order of
 * first use. `coverage` defaults to the bundled font's.
 */
export function missingGlyphs(text: string, coverage: CodeRanges = defaultCoverage()): string[] {
  const missing = new Set<string>()
  for (const ch of drawnCharacters(text)) {
    if (!covers(coverage, ch.codePointAt(0) ?? 0)) missing.add(ch)
  }
  return [...missing]
}

const tag = (bytes: Uint8Array, at: number) => String.fromCharCode(...bytes.subarray(at, at + 4))

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** The font's `cmap` table, from a TrueType/OpenType file, a collection (its first font) or a
 *  WOFF. WOFF2 isn't read (nor drawn by troika). */
async function cmapTable(bytes: Uint8Array): Promise<DataView | null> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const signature = tag(bytes, 0)
  if (signature === 'wOFF') {
    const count = view.getUint16(12)
    for (let i = 0; i < count; i++) {
      const at = 44 + i * 20
      if (tag(bytes, at) !== 'cmap') continue
      const offset = view.getUint32(at + 4)
      const length = view.getUint32(at + 8)
      const original = view.getUint32(at + 12)
      let data = bytes.subarray(offset, offset + length)
      if (length < original) data = await inflate(data)
      return new DataView(data.buffer, data.byteOffset, data.byteLength)
    }
    return null
  }
  if (signature === 'wOF2') throw new Error('WOFF2 fonts are not supported')
  const base = signature === 'ttcf' ? view.getUint32(12) : 0
  const count = view.getUint16(base + 4)
  for (let i = 0; i < count; i++) {
    const at = base + 12 + i * 16
    if (tag(bytes, at) !== 'cmap') continue
    return new DataView(
      bytes.buffer,
      bytes.byteOffset + view.getUint32(at + 8),
      view.getUint32(at + 12),
    )
  }
  return null
}

function mergeRanges(ranges: CodeRanges): CodeRanges {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0])
  const out: CodeRanges = []
  for (const [a, b] of sorted) {
    const last = out[out.length - 1]
    if (last && a <= last[1] + 1) last[1] = Math.max(last[1], b)
    else out.push([a, b])
  }
  return out
}

/**
 * The code points a font file draws, read from its `cmap` the way troika-three-text reads it (the
 * same subtable preference, so this is what a text component can actually show).
 */
export async function readCoverage(file: ArrayBuffer | Uint8Array): Promise<CodeRanges> {
  const bytes = file instanceof Uint8Array ? file : new Uint8Array(file)
  const cmap = await cmapTable(bytes)
  if (!cmap) return []
  const subtables = new Map<string, number>()
  for (let i = 0, n = cmap.getUint16(2); i < n; i++) {
    const at = 4 + i * 8
    subtables.set(`${cmap.getUint16(at)}/${cmap.getUint16(at + 2)}`, cmap.getUint32(at + 4))
  }
  const offset = ['0/4', '3/1', '1/0', '0/3']
    .map((key) => subtables.get(key))
    .find((o) => o !== undefined)
  if (offset === undefined) return []
  const format = cmap.getUint16(offset)
  if (format === 12) {
    const ranges: CodeRanges = []
    for (let g = 0, n = cmap.getUint32(offset + 12); g < n; g++) {
      const at = offset + 16 + g * 12
      const start = cmap.getUint32(at)
      const end = cmap.getUint32(at + 4)
      const first = cmap.getUint32(at + 8) === 0 ? start + 1 : start
      if (first <= end) ranges.push([first, end])
    }
    return mergeRanges(ranges)
  }
  const codes: number[] = []
  if (format === 4) {
    const segments = cmap.getUint16(offset + 6) / 2
    const ends = offset + 14
    const starts = ends + segments * 2 + 2
    const deltas = starts + segments * 2
    const rangeOffsets = deltas + segments * 2
    for (let s = 0; s < segments; s++) {
      const end = cmap.getUint16(ends + s * 2)
      const start = cmap.getUint16(starts + s * 2)
      const delta = cmap.getInt16(deltas + s * 2)
      const rangeOffset = cmap.getUint16(rangeOffsets + s * 2)
      for (let c = start; c <= end && c !== 0xffff; c++) {
        let glyph: number
        if (rangeOffset === 0) glyph = (c + delta) & 0xffff
        else {
          const at = rangeOffsets + s * 2 + rangeOffset + (c - start) * 2
          glyph = at + 2 <= cmap.byteLength ? cmap.getUint16(at) : 0
          if (glyph) glyph = (glyph + delta) & 0xffff
        }
        if (glyph) codes.push(c)
      }
    }
  } else if (format === 0) {
    for (let c = 0; c < 256; c++) if (cmap.getUint8(offset + 6 + c)) codes.push(c)
  } else if (format === 6) {
    const first = cmap.getUint16(offset + 6)
    for (let i = 0, n = cmap.getUint16(offset + 8); i < n; i++) {
      if (cmap.getUint16(offset + 10 + i * 2)) codes.push(first + i)
    }
  }
  return mergeRanges(codes.map((c) => [c, c]))
}
