import { describe, expect, it } from 'vitest'
import { pixelText, versionOutput } from './banner.ts'

describe('pixelText', () => {
  it('folds 7 pixel rows into 4 half-block lines', () => {
    const lines = pixelText('runek v0.13.0')
    expect(lines).toHaveLength(4)
    expect(lines?.join('')).toMatch(/^[ ▀▄█]+$/)
  })

  it('covers prerelease tags and gives up on unknown characters', () => {
    expect(pixelText('runek v0.14.0-beta.1')).not.toBeNull()
    expect(pixelText('runek v1.0.0+build')).toBeNull()
  })
})

describe('versionOutput', () => {
  it('prints the bare version when piped', () => {
    expect(versionOutput('0.13.0', { tty: false, color: true })).toBe('0.13.0\n')
  })

  it('draws the banner in a terminal, uncolored with NO_COLOR', () => {
    const out = versionOutput('0.13.0', { tty: true, columns: 120, color: false })
    expect(out.split('\n').filter(Boolean)).toHaveLength(4)
    expect(out).not.toContain('\x1b[')
  })

  it('falls back to one line when the terminal is too narrow', () => {
    expect(versionOutput('0.13.0', { tty: true, columns: 40, color: true })).toBe('runek v0.13.0\n')
  })
})
