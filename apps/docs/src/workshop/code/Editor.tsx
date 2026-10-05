import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  HighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language'
import { lintGutter, lintKeymap } from '@codemirror/lint'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { Annotation, EditorState, type Extension } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import { tags as t } from '@lezer/highlight'
import { useEffect, useRef } from 'react'

const highlight = HighlightStyle.define([
  { tag: t.keyword, color: '#c792ea' },
  { tag: [t.propertyName], color: '#82aaff' },
  { tag: [t.string, t.special(t.string)], color: '#ecc48d' },
  { tag: [t.number, t.bool, t.null], color: '#f78c6c' },
  { tag: [t.typeName, t.className], color: '#ffcb8b' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#82aaff' },
  { tag: t.tagName, color: '#3df58a' },
  { tag: t.attributeName, color: '#addb67' },
  { tag: t.comment, color: '#637777', fontStyle: 'italic' },
  { tag: [t.operator, t.punctuation, t.bracket], color: '#7fdbca' },
  { tag: t.variableName, color: '#d6deeb' },
])

const theme = EditorView.theme(
  {
    '&': { height: '100%', fontSize: '12px', backgroundColor: 'transparent', color: '#d6deeb' },
    '.cm-scroller': { fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', lineHeight: '1.55' },
    '.cm-content': { caretColor: '#3df58a' },
    '.cm-cursor': { borderLeftColor: '#3df58a' },
    '.cm-gutters': { backgroundColor: 'transparent', color: '#4b6158', border: 'none' },
    '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.03)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: '#9fb8ad' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(42,167,255,0.25)',
    },
    '.cm-matchingBracket': { backgroundColor: 'rgba(61,245,138,0.15)', outline: 'none' },
    '.cm-tooltip': { backgroundColor: '#0c1119', border: '1px solid #1d2b38', borderRadius: '8px' },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
      backgroundColor: 'rgba(61,245,138,0.16)',
      color: '#3df58a',
    },
    '.cm-completionDetail': { color: '#5f7d75', fontStyle: 'normal', marginLeft: '8px' },
    '.cm-completionInfo': {
      maxWidth: '320px',
      fontFamily: 'ui-sans-serif, system-ui',
      fontSize: '12px',
    },
    '.cm-panels': { backgroundColor: '#0c1119', color: '#cfe6db' },
    '.cm-diagnostic-error': { borderLeftColor: '#ff6b6b' },
    '.cm-diagnostic-warning': { borderLeftColor: '#ffcf5a' },
    '.cm-foldPlaceholder': {
      backgroundColor: 'transparent',
      border: '1px solid #1d2b38',
      color: '#5f7d75',
    },
    '.ws-cm-node': { backgroundColor: 'rgba(61,245,138,0.07)' },
  },
  { dark: true },
)

export const baseExtensions: Extension[] = [
  lineNumbers(),
  highlightActiveLineGutter(),
  foldGutter(),
  drawSelection(),
  history(),
  indentOnInput(),
  bracketMatching(),
  closeBrackets(),
  autocompletion({ activateOnTyping: true }),
  highlightActiveLine(),
  highlightSelectionMatches(),
  lintGutter(),
  syntaxHighlighting(highlight),
  theme,
  EditorView.lineWrapping,
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap,
    indentWithTab,
  ]),
]

/** Marks a document replacement that came from outside (not the user typing). */
const external = Annotation.define<boolean>()

interface EditorProps {
  value: string
  onChange?: (text: string) => void
  extensions: Extension[]
  /** Receives the view once it exists (for selection sync and commands). */
  onView?: (view: EditorView | null) => void
  label: string
}

/** A CodeMirror 6 editor that follows `value` from outside without clobbering the user's typing. */
export function Editor({ value, onChange, extensions, onView, label }: EditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const change = useRef(onChange)
  change.current = onChange

  useEffect(() => {
    if (!host.current) return
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          ...baseExtensions,
          ...extensions,
          EditorView.contentAttributes.of({ 'aria-label': label }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !update.transactions.some((tr) => tr.annotation(external))) {
              change.current?.(update.state.doc.toString())
            }
          }),
        ],
      }),
    })
    view.current = v
    onView?.(v)
    return () => {
      onView?.(null)
      v.destroy()
      view.current = null
    }
  }, [extensions])

  useEffect(() => {
    const v = view.current
    if (!v) return
    const current = v.state.doc.toString()
    if (current === value) return
    const head = Math.min(v.state.selection.main.head, value.length)
    v.dispatch({
      changes: { from: 0, to: current.length, insert: value },
      selection: { anchor: head },
      annotations: external.of(true),
    })
  }, [value])

  return <div ref={host} className="ws-editor" />
}
