import { registry } from '@runek/components'
import { parseWorld, type WorldData, WorldEditor, WorldRenderer } from '@runek/core'
import { useEffect, useState } from 'react'

export function App() {
  const [world, setWorld] = useState<WorldData | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    fetch('/helicon.world.json')
      .then((res) => res.text())
      .then((text) => setWorld(parseWorld(text)))
      .catch((error) => console.error('[helicon] failed to load world:', error))
  }, [])

  if (!world) return null

  return (
    <>
      {editing ? (
        <WorldEditor data={world} registry={registry} onChange={setWorld} lights={false} />
      ) : (
        <WorldRenderer data={world} registry={registry} lights={false} />
      )}

      <button type="button" className="mode-toggle" onClick={() => setEditing((on) => !on)}>
        {editing ? '▶ Walk' : '✎ Edit'}
      </button>

      {!editing && (
        <p className="hint">
          <b>WASD</b> / arrows move · <b>Shift</b> run · <b>Space</b> jump · <b>drag</b> to look
        </p>
      )}
    </>
  )
}
