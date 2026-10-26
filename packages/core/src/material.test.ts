import { MeshBasicMaterial, MeshStandardMaterial } from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  materialKey,
  releaseMaterial,
  retainMaterial,
  sharedMaterial,
  sharedMaterialCount,
} from './material'

describe('materialKey', () => {
  it('compares colors by value', () => {
    expect(materialKey({ color: '#ffffff' })).toBe(materialKey({ color: 'white' }))
    expect(materialKey({ color: 0xff0000 })).toBe(materialKey({ color: '#f00' }))
    expect(materialKey({ color: '#7a5a40' })).not.toBe(materialKey({ color: '#7a5a41' }))
  })

  it('ignores key order and unset fields', () => {
    expect(materialKey({ roughness: 0.5, color: '#123456', metalness: undefined })).toBe(
      materialKey({ color: '#123456', roughness: 0.5 }),
    )
  })

  it('separates kinds and settings', () => {
    expect(materialKey({ color: 'red' })).toBe(materialKey({ kind: 'standard', color: 'red' }))
    expect(materialKey({ color: 'red' })).not.toBe(materialKey({ kind: 'basic', color: 'red' }))
    expect(materialKey({ color: 'red' })).not.toBe(materialKey({ color: 'red', flatShading: true }))
  })
})

describe('sharedMaterial', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns one instance per look, of the right kind', () => {
    const a = sharedMaterial({ color: '#335577', roughness: 0.4 })
    const b = sharedMaterial({ roughness: 0.4, color: '#357' })
    expect(a).toBe(b)
    expect(a).toBeInstanceOf(MeshStandardMaterial)
    expect((a as MeshStandardMaterial).roughness).toBe(0.4)
    expect(sharedMaterial({ kind: 'basic', color: '#335577' })).toBeInstanceOf(MeshBasicMaterial)
  })

  it('disposes a material shortly after its last user lets go', () => {
    vi.useFakeTimers()
    const look = { color: '#010203' }
    const key = materialKey(look)
    const material = sharedMaterial(look, key)
    const dispose = vi.spyOn(material, 'dispose')
    retainMaterial(key)
    vi.advanceTimersByTime(10_000)
    expect(dispose).not.toHaveBeenCalled()

    releaseMaterial(key)
    retainMaterial(key) // a remount picks it straight back up
    vi.advanceTimersByTime(10_000)
    expect(dispose).not.toHaveBeenCalled()

    const before = sharedMaterialCount()
    releaseMaterial(key)
    vi.advanceTimersByTime(10_000)
    expect(dispose).toHaveBeenCalledOnce()
    expect(sharedMaterialCount()).toBe(before - 1)
    expect(sharedMaterial(look, key)).not.toBe(material)
  })

  it('disposes a material created but never retained', () => {
    vi.useFakeTimers()
    const material = sharedMaterial({ color: '#0a0b0c' })
    const dispose = vi.spyOn(material, 'dispose')
    vi.advanceTimersByTime(10_000)
    expect(dispose).toHaveBeenCalledOnce()
  })
})
