import { describe, expect, it } from 'vitest'
import { isEditableTarget } from './input'

const el = (tagName: string, isContentEditable = false) =>
  ({ tagName, isContentEditable }) as unknown as EventTarget

describe('isEditableTarget', () => {
  it('leaves form fields and editable text to the page', () => {
    for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) expect(isEditableTarget(el(tag))).toBe(true)
    expect(isEditableTarget(el('DIV', true))).toBe(true)
  })

  it('keeps everything else for the world', () => {
    expect(isEditableTarget(el('CANVAS'))).toBe(false)
    expect(isEditableTarget(el('BODY'))).toBe(false)
    expect(isEditableTarget(null)).toBe(false)
    expect(isEditableTarget({} as EventTarget)).toBe(false)
  })
})
