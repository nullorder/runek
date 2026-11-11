import type { GLProps } from '@react-three/fiber'
import { describe, expect, it, vi } from 'vitest'
import { glProps } from './renderer'

describe('glProps', () => {
  it('asks for a WebGL renderer when none is given', () => {
    expect(glProps(undefined, true)).toEqual({ preserveDrawingBuffer: true })
  })

  it('merges renderer parameters, letting the app win', () => {
    expect(glProps({ antialias: false }, true)).toEqual({
      preserveDrawingBuffer: true,
      antialias: false,
    })
    expect(glProps({ preserveDrawingBuffer: true }, false)).toEqual({
      preserveDrawingBuffer: true,
    })
  })

  it('passes a renderer instance through untouched', () => {
    const instance = { render: () => {}, setSize: () => {} } as unknown as GLProps
    expect(glProps(instance, true)).toBe(instance)
  })

  it('hands a factory the defaults plus preserveDrawingBuffer', async () => {
    const made = { render: () => {} }
    const factory = vi.fn(async () => made)
    const gl = glProps(factory as unknown as GLProps, true) as (d: object) => Promise<unknown>
    const canvas = {}
    await expect(gl({ canvas, antialias: true })).resolves.toBe(made)
    expect(factory).toHaveBeenCalledWith({ canvas, antialias: true, preserveDrawingBuffer: true })
  })
})
