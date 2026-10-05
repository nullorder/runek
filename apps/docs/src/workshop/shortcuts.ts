import { isEditableTarget } from '@runek/core'
import { useEffect } from 'react'
import { copyText, focusDrop, importWorldText } from './actions'
import { togglePanel } from './panels/layout'
import { locate } from './state/ops'
import {
  addNodes,
  duplicateSelected,
  redoWorld,
  removeSelected,
  requestCamera,
  runCode,
  select,
  setGizmo,
  setMode,
  startPlay,
  stopPlay,
  toast,
  toggleView,
  undoWorld,
  useWorkshop,
} from './state/store'

export const SHORTCUTS: [string, string][] = [
  ['⌘K', 'Command palette'],
  ['⌘Z · ⇧⌘Z', 'Undo · redo'],
  ['g · r', 'Move · rotate gizmo'],
  ['f · Home', 'Frame selection · frame all'],
  ['d', 'Duplicate selection'],
  ['⌫', 'Delete selection'],
  ['Esc', 'Deselect, stop playing, close'],
  ['⌘C · ⌘V', 'Copy · paste nodes as world JSON'],
  ['p', 'Play (walk the world)'],
  ['Tab', 'Hide / show every panel'],
  ['1 · 2 · 3', 'Build · Lab · Code'],
  ['w', 'World panel'],
  ['⌘↵', 'Run App.tsx'],
  ['?', 'This sheet'],
]

/** Global keyboard shortcuts. Keys aimed at a text field are left alone (except ⌘K / ⌘↵). */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      const s = useWorkshop.getState()
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        useWorkshop.setState({ paletteOpen: !s.paletteOpen })
        return
      }
      if (mod && e.key === 'Enter') {
        e.preventDefault()
        if (s.code !== null) runCode()
        return
      }
      if (e.key === 'Escape') {
        if (s.paletteOpen || s.helpOpen)
          useWorkshop.setState({ paletteOpen: false, helpOpen: false })
        else if (s.playing) stopPlay()
        else if (s.focusMode) useWorkshop.setState({ focusMode: false })
        else select(null)
        return
      }
      if (isEditableTarget(e.target) || s.paletteOpen) return
      if (s.playing) return

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redoWorld()
        else undoWorld()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redoWorld()
        return
      }
      if (mod && e.key.toLowerCase() === 'c' && s.selection && !window.getSelection()?.toString()) {
        const found = locate(s.world.nodes, s.selection)
        if (found) {
          e.preventDefault()
          copyText(JSON.stringify(found.node, null, 2), `Copied ${found.node.type} as JSON`)
        }
        return
      }
      if (mod || e.altKey) return

      switch (e.key) {
        case 'g':
          setGizmo('translate')
          break
        case 'r':
          setGizmo('rotate')
          break
        case 'f':
          if (s.selection) requestCamera({ kind: 'frame', id: s.selection })
          break
        case 'Home':
          requestCamera({ kind: 'all' })
          break
        case 'd':
          duplicateSelected()
          break
        case 'Delete':
        case 'Backspace':
          removeSelected()
          break
        case 'p':
          if (s.mode !== 'lab') startPlay()
          break
        case 'Tab':
          e.preventDefault()
          useWorkshop.setState({ focusMode: !s.focusMode })
          break
        case '1':
          setMode('build')
          break
        case '2':
          setMode('lab')
          break
        case '3':
          setMode('code')
          break
        case 'w':
          togglePanel(s.mode, 'world')
          break
        case '?':
          useWorkshop.setState({ helpOpen: !s.helpOpen })
          break
        case '#':
          toggleView('grid')
          break
        default:
          return
      }
    }

    // Paste: a node, a list of nodes, or a whole world.
    const onPaste = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target)) return
      const text = e.clipboardData?.getData('text/plain')?.trim()
      if (!text || !/^[[{]/.test(text)) return
      try {
        const data = JSON.parse(text)
        e.preventDefault()
        if (Array.isArray(data?.nodes) && data.version === 1) {
          importWorldText(text, 'the clipboard')
        } else {
          const nodes = Array.isArray(data) ? data : [data]
          if (!nodes.every((n) => typeof n?.type === 'string')) throw new Error('not nodes')
          // A single node lands at the focus point rather than at its old spot.
          if (nodes.length === 1 && Array.isArray(nodes[0].props?.position)) {
            nodes[0] = {
              ...nodes[0],
              props: { ...nodes[0].props, position: [0.5, nodes[0].props.position[1], 0.5] },
            }
          }
          addNodes(nodes, { at: focusDrop() })
          toast(`Pasted ${nodes.length} node${nodes.length > 1 ? 's' : ''}`)
        }
      } catch {
        toast('The clipboard has no world JSON')
      }
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('paste', onPaste)
    }
  }, [])
}
