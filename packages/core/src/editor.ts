// The runtime editor, kept off the main entry so an app that only renders worlds never
// pulls in `leva` (its props panel). Import from `@runek/core/editor`.
export type { WorldEditorProps } from './WorldEditor'
export { WorldEditor } from './WorldEditor'
