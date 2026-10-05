import { useEffect, useMemo } from 'react'
import { fixIssue, worldIssues } from '../actions'
import { valueAt } from '../code/json-tree'
import { validateWorld } from '../code/validate'
import { Panel } from '../panels/Panel'
import { SCHEMA } from '../schema'
import { requestCamera, select, useWorkshop } from '../state/store'

const KIND: Record<string, string> = {
  buried: 'buried',
  floating: 'floating',
  'water-above-ground': 'water above its rim',
}

/** Ground problems (buried, floating, spilling water) and data problems, each one click away. */
export default function IssuesPanel() {
  const world = useWorkshop((s) => s.world)
  const custom = useWorkshop((s) => s.sandbox.registry)
  const ground = useMemo(() => worldIssues(world), [world])
  const data = useMemo(() => validateWorld(world, SCHEMA, custom), [world, custom])

  useEffect(() => {
    useWorkshop.setState({ issueCount: ground.length + data.length })
  }, [ground, data])

  const idAt = (path: (string | number)[]) => {
    for (let n = path.length; n > 0; n--) {
      const v = valueAt(world, path.slice(0, n)) as { id?: string; type?: string } | undefined
      if (v && typeof v === 'object' && typeof v.type === 'string' && v.id) return v.id
    }
    return undefined
  }

  const go = (id?: string) => {
    if (!id) return
    select(id)
    requestCamera({ kind: 'frame', id })
  }

  return (
    <Panel id="issues">
      <div className="ws-issues">
        {!ground.length && !data.length && (
          <p className="ws-muted ws-pad">
            No issues. Everything stands on the ground and every prop checks out.
          </p>
        )}
        {ground.map((issue) => (
          <div key={`${issue.path}:${issue.kind}`} className="ws-issue">
            <button type="button" className="ws-issue__main" onClick={() => go(issue.id)}>
              <b>{issue.type}</b> {KIND[issue.kind]} by{' '}
              {Math.abs(issue.at[1] - issue.ground).toFixed(2)} m
            </button>
            {issue.fix !== undefined && (
              <button
                type="button"
                className="ws-btn ws-btn--small"
                title={`Set position y to ${issue.fix}`}
                onClick={() => fixIssue(issue.id, issue.fix)}
              >
                fix
              </button>
            )}
          </div>
        ))}
        {data.map((issue) => (
          <div
            key={`${issue.path.join('.')}:${issue.message}`}
            className={`ws-issue is-${issue.severity}`}
          >
            <button type="button" className="ws-issue__main" onClick={() => go(idAt(issue.path))}>
              <code>{issue.path.join('.')}</code> {issue.message}
            </button>
          </div>
        ))}
      </div>
    </Panel>
  )
}
