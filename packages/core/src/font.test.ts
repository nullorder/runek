import { describe, expect, it } from 'vitest'
import { DEFAULT_FONT_COVERAGE, missingGlyphs, parseCoverage } from './coverage'
import { DEFAULT_FONT, fontCoverage, pickFace } from './font'

describe('pickFace (#66)', () => {
  const latin = parseCoverage('20-7e')
  const cjk = parseCoverage('20-7e,4e00-9fff')
  const kana = parseCoverage('3040-30ff')

  it('keeps the role face when it draws everything', () => {
    expect(pickFace('Hello', ['role', 'cjk'], [latin, cjk])).toBe('role')
    expect(pickFace('', ['role', 'cjk'], [latin, cjk])).toBe('role')
  })

  it('takes the declared face that covers the most of the text', () => {
    expect(pickFace('Tokyo 東京', ['role', 'kana', 'cjk'], [latin, kana, cjk])).toBe('cjk')
    expect(pickFace('ひらがな a', ['role', 'kana'], [latin, kana])).toBe('kana')
    // a tie keeps the earlier face
    expect(pickFace('ab ひら', ['role', 'kana'], [latin, kana])).toBe('role')
  })

  it("doesn't count what draws as nothing", () => {
    expect(pickFace('Hi ❤️', ['role', 'cjk'], [latin, cjk])).toBe('role')
  })
})

describe('fontCoverage', () => {
  it('knows the bundled font without fetching it', async () => {
    expect(await fontCoverage(DEFAULT_FONT)).toEqual(parseCoverage(DEFAULT_FONT_COVERAGE))
  })

  it('reads a font from a data URI, and covers nothing when it cannot', async () => {
    const { lastResortFont } = await import('./last-resort')
    expect(await fontCoverage(lastResortFont())).toEqual([[0, 0x10ffff]])
    const warn = console.warn
    console.warn = () => {}
    try {
      expect(await fontCoverage('data:font/ttf;base64,AAAA')).toEqual([])
    } finally {
      console.warn = warn
    }
  })
})

describe('missingGlyphs', () => {
  it('lists characters outside the coverage once, in order', () => {
    expect(missingGlyphs('Hello, World')).toEqual([])
    expect(missingGlyphs('naïve café €5')).toEqual([])
    expect(missingGlyphs('→ 東京 → 東')).toEqual(['→', '東', '京'])
    expect(missingGlyphs('AZ', parseCoverage('41-59'))).toEqual(['Z'])
  })

  it('ignores what draws as nothing anyway: spaces, controls, joiners, selectors', () => {
    expect(missingGlyphs('a\tb\nc\u3000d\u200de\ufe0f')).toEqual([])
  })
})
