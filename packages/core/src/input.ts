import { useEffect, useMemo } from 'react'

/** True when a key event is aimed at something that takes typing (a form field or editable text). */
export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el?.tagName) return false
  return (
    el.isContentEditable ||
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT'
  )
}

/**
 * The key-event source `World` hands drei's `KeyboardControls`. drei listens on the window
 * and reads every key, so typing "wasd" into a text field beside the canvas would walk the
 * avatar. This forwards window key events except those aimed at an editable element, and
 * nothing at all while `enabled` is false. Keys held when input switches off or the window
 * loses focus are released, so none stay stuck down.
 */
export function useKeySource(enabled: boolean): EventTarget {
  const source = useMemo(() => new EventTarget(), [])

  useEffect(() => {
    if (!enabled) return
    const held = new Map<string, string>()
    const forward = (type: 'keydown' | 'keyup', key: string, code: string) =>
      source.dispatchEvent(new KeyboardEvent(type, { key, code }))
    const releaseAll = () => {
      for (const [code, key] of held) forward('keyup', key, code)
      held.clear()
    }

    const onDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return
      held.set(event.code, event.key)
      forward('keydown', event.key, event.code)
    }
    // A key pressed for the world is released for the world, wherever focus went meanwhile.
    const onUp = (event: KeyboardEvent) => {
      if (!held.delete(event.code)) return
      forward('keyup', event.key, event.code)
    }

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', releaseAll)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', releaseAll)
      releaseAll()
    }
  }, [enabled, source])

  return source
}
