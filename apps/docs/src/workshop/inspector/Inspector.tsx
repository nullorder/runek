import { registry } from '@runek/components'
import {
  ANCHOR_KINDS,
  DEFAULT_PALETTE,
  isCompositeDef,
  type JsonValue,
  type WorldNode,
} from '@runek/core'
import { useMemo, useState } from 'react'
import { Panel } from '../panels/Panel'
import { live } from '../scene/refs'
import { codeOnlyProps, editableProps, hasSeed, schemaFor } from '../schema'
import { labelFor } from '../schema/controls'
import { asVec3, locate, round, setAnchor, unpackNode } from '../state/ops'
import {
  applyLab,
  commit,
  duplicateSelected,
  groupSelected,
  openInLab,
  patchLab,
  patchNode,
  removeSelected,
  requestCamera,
  setLab,
  useWorkshop,
} from '../state/store'
import { Field, type FieldContext, JsonInput, NumberInput, Vec3Input } from './fields'

const randomSeed = () => 1 + Math.floor(Math.random() * 9999)

/** The generated form for a component's props (everything but the transform). */
export function PropsForm({
  type,
  props,
  onPatch,
  scope,
}: {
  type: string
  props: Record<string, JsonValue>
  onPatch: (patch: Record<string, JsonValue | undefined>, key?: string) => void
  scope: string
}) {
  const world = useWorkshop((s) => s.world)
  const [filter, setFilter] = useState('')
  const schema = schemaFor(type)
  const palette = useMemo(
    () => ({ ...DEFAULT_PALETTE, ...world.palette }) as Record<string, string>,
    [world.palette],
  )
  if (!schema)
    return <p className="ws-muted">No schema for “{type}”. Edit its props as JSON below.</p>
  const ctx: FieldContext = { component: type, defs: schema.defs, palette, scope }
  const fields = editableProps(type).filter(
    ([name]) => !filter || name.toLowerCase().includes(filter.toLowerCase()),
  )
  const changed = fields.filter(([name]) => props[name] !== undefined).length

  return (
    <div className="ws-form">
      {editableProps(type).length > 7 && (
        <div className="ws-form__filter">
          <input
            className="ws-text"
            placeholder={`Filter ${editableProps(type).length} props…`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {changed > 0 && (
            <button
              type="button"
              className="ws-btn ws-btn--small"
              title="Reset every prop to its default"
              onClick={() => onPatch(Object.fromEntries(fields.map(([name]) => [name, undefined])))}
            >
              reset {changed}
            </button>
          )}
        </div>
      )}
      {fields.map(([name, prop]) => (
        <Field
          key={name}
          name={name}
          schema={prop}
          value={props[name]}
          ctx={ctx}
          onChange={(value, key) => onPatch({ [name]: value }, key)}
        />
      ))}
    </div>
  )
}

export function SeedRow({
  seed,
  fallback = 1,
  onChange,
}: {
  seed: number | undefined
  fallback?: number
  onChange: (seed: number | undefined) => void
}) {
  const current = seed ?? fallback
  return (
    <div className="ws-field">
      <div className="ws-field__label">seed</div>
      <div className="ws-field__control ws-seed">
        <button
          type="button"
          className="ws-icon"
          title="Previous seed"
          onClick={() => onChange(current - 1)}
        >
          ‹
        </button>
        <NumberInput
          value={current}
          onChange={(n) => onChange(Math.round(n))}
          step={1}
          integer
          label="seed"
        />
        <button
          type="button"
          className="ws-icon"
          title="Next seed"
          onClick={() => onChange(current + 1)}
        >
          ›
        </button>
        <button
          type="button"
          className="ws-btn ws-btn--small"
          title="Re-roll: a new seed, a new variation"
          onClick={() => onChange(randomSeed())}
        >
          🎲
        </button>
      </div>
    </div>
  )
}

const seedDefault = (type: string) => {
  const d = schemaFor(type)?.props.seed?.default
  return typeof d === 'number' ? d : 1
}

function Section({
  title,
  children,
  open = true,
  aside,
}: {
  title: string
  children: React.ReactNode
  open?: boolean
  aside?: React.ReactNode
}) {
  return (
    <details className="ws-section" open={open}>
      <summary>
        <span>{title}</span>
        {aside}
      </summary>
      {children}
    </details>
  )
}

function NodeInspector({
  node,
  path,
  parentId,
}: {
  node: WorldNode
  path: string
  parentId: string | null
}) {
  const id = node.id as string
  const props = node.props ?? {}
  const entry = registry[node.type]
  const composite = isCompositeDef(entry) ? entry : null
  const seeded = hasSeed(node.type) || props.seed !== undefined
  const codeOnly = codeOnlyProps(node.type)
  const rest = useMemo(() => {
    const { position: _p, rotation: _r, seed: _s, ...others } = props
    return others
  }, [props])

  const anchorTo = (anchor: WorldNode['anchor']) => {
    const world = useWorkshop.getState().world
    const at = asVec3(props.position) ?? [0, 0, 0]
    const standing = node.anchor ? (live.ground?.position(path)?.[1] ?? at[1]) : at[1]
    const base = anchor
      ? (live.ground?.groundAt(at[0], at[2], { kinds: ANCHOR_KINDS[anchor], exclude: id }) ?? 0)
      : 0
    commit(setAnchor(world, id, anchor, anchor ? standing - base : standing))
  }
  const drop = (anchor: 'ground' | 'surface') => {
    const at = asVec3(props.position) ?? [0, 0, 0]
    const y = node.anchor
      ? 0
      : (live.ground?.groundAt(at[0], at[2], { kinds: ANCHOR_KINDS[anchor], exclude: id }) ?? 0)
    patchNode(id, { position: [at[0], round(y), at[2]] })
  }

  return (
    <>
      <div className="ws-inspector__head">
        <div>
          <strong>{node.type}</strong> <code className="ws-muted">{id}</code>
          {schemaFor(node.type)?.description && (
            <p className="ws-inspector__desc" title={schemaFor(node.type)?.description}>
              {schemaFor(node.type)?.description}
            </p>
          )}
        </div>
        <div className="ws-inspector__tools">
          <button
            type="button"
            className="ws-btn ws-btn--small"
            title="Frame (f)"
            onClick={() => requestCamera({ kind: 'frame', id })}
          >
            frame
          </button>
          <button
            type="button"
            className="ws-btn ws-btn--small"
            title="Duplicate (d)"
            onClick={duplicateSelected}
          >
            duplicate
          </button>
          {schemaFor(node.type)?.kind === 'component' && (
            <button
              type="button"
              className="ws-btn ws-btn--small"
              title="Tune it in the lab"
              onClick={() => openInLab(id)}
            >
              lab
            </button>
          )}
          {composite && (
            <button
              type="button"
              className="ws-btn ws-btn--small"
              title="Replace this composite with its editable parts"
              onClick={() => commit(unpackNode(useWorkshop.getState().world, id, composite))}
            >
              unpack
            </button>
          )}
          {!parentId && (
            <button
              type="button"
              className="ws-btn ws-btn--small"
              title="Wrap in a Group"
              onClick={groupSelected}
            >
              group
            </button>
          )}
          <button
            type="button"
            className="ws-btn ws-btn--small ws-btn--danger"
            title="Delete (⌫)"
            onClick={removeSelected}
          >
            delete
          </button>
        </div>
      </div>

      <Section title="Transform">
        <div className="ws-field">
          <div className="ws-field__label">position</div>
          <Vec3Input
            value={asVec3(props.position)}
            onChange={(v) => patchNode(id, { position: v.map(round) }, `${id}:position`)}
          />
        </div>
        <div className="ws-field">
          <div className="ws-field__label">rotation °</div>
          <Vec3Input
            value={asVec3(props.rotation)}
            degrees
            step={1}
            onChange={(v) => patchNode(id, { rotation: v }, `${id}:rotation`)}
          />
        </div>
        <div className="ws-field">
          <div className="ws-field__label" title="Measure Y from the ground instead of absolutely">
            anchor
          </div>
          <div className="ws-field__control ws-anchor">
            <div className="ws-seg ws-seg--small">
              {(['none', 'ground', 'surface'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  className={(node.anchor ?? 'none') === a ? 'is-on' : ''}
                  onClick={() => anchorTo(a === 'none' ? undefined : a)}
                >
                  {a}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="ws-btn ws-btn--small"
              title="Seat it on the terrain under it"
              onClick={() => drop('ground')}
            >
              drop ↓
            </button>
            <button
              type="button"
              className="ws-btn ws-btn--small"
              title="Seat it on the highest surface under it"
              onClick={() => drop('surface')}
            >
              drop on surface
            </button>
          </div>
        </div>
      </Section>

      {seeded && (
        <Section title="Seed">
          <SeedRow
            seed={typeof props.seed === 'number' ? props.seed : undefined}
            fallback={seedDefault(node.type)}
            onChange={(seed) => patchNode(id, { seed }, `${id}:seed`)}
          />
        </Section>
      )}

      {node.type !== 'Group' && (
        <Section
          title={composite ? 'Composite' : 'Props'}
          aside={<span className="ws-muted">{Object.keys(rest).length} set</span>}
        >
          {composite ? (
            <p className="ws-muted ws-pad">
              {composite.description ?? 'A data arrangement of parts.'} Its seed cascades to the
              seeded parts. Unpack it to edit the parts one by one.
            </p>
          ) : (
            <PropsForm
              type={node.type}
              props={props}
              scope={id}
              onPatch={(patch, key) => patchNode(id, patch, key ?? null)}
            />
          )}
        </Section>
      )}

      {codeOnly.length > 0 && (
        <Section title="Code-only props" open={false}>
          <p className="ws-muted ws-pad">
            {codeOnly.map((name) => labelFor(name)).join(', ')}: callbacks and React children can't
            live in a world file. Use them in{' '}
            <button
              type="button"
              className="ws-link"
              onClick={() => useWorkshop.setState({ mode: 'code' })}
            >
              App.tsx
            </button>
            .
          </p>
        </Section>
      )}

      <Section title="Advanced (raw props)" open={false}>
        <JsonInput
          value={props}
          rows={8}
          onChange={(value) => {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              const nextProps = value as Record<string, JsonValue>
              const removed = Object.fromEntries(
                Object.keys(props)
                  .filter((k) => !(k in nextProps))
                  .map((k) => [k, undefined]),
              )
              patchNode(id, { ...removed, ...nextProps })
            }
          }}
        />
      </Section>
    </>
  )
}

function LabInspector() {
  const lab = useWorkshop((s) => s.lab)
  const selection = useWorkshop((s) => s.selection)
  const world = useWorkshop((s) => s.world)
  const props = (lab.editing === 'b' && lab.propsB ? lab.propsB : lab.props) ?? {}
  const target = selection ? locate(world.nodes, selection)?.node : null
  return (
    <>
      <div className="ws-inspector__head">
        <div>
          <strong>{lab.type}</strong>
          {schemaFor(lab.type)?.description && (
            <p className="ws-inspector__desc" title={schemaFor(lab.type)?.description}>
              {schemaFor(lab.type)?.description}
            </p>
          )}
        </div>
        <div className="ws-inspector__tools">
          {target?.type === lab.type ? (
            <button
              type="button"
              className="ws-btn ws-btn--small ws-btn--primary"
              onClick={() => applyLab(target.id ?? null)}
            >
              apply to scene
            </button>
          ) : (
            <button
              type="button"
              className="ws-btn ws-btn--small ws-btn--primary"
              onClick={() => applyLab(null)}
            >
              add to scene
            </button>
          )}
        </div>
      </div>
      {lab.propsB && (
        <div className="ws-seg ws-seg--wide">
          {(['a', 'b'] as const).map((side) => (
            <button
              key={side}
              type="button"
              className={lab.editing === side ? 'is-on' : ''}
              onClick={() => setLab({ editing: side })}
            >
              editing {side.toUpperCase()}
            </button>
          ))}
        </div>
      )}
      {hasSeed(lab.type) && (
        <Section title="Seed">
          <SeedRow
            seed={typeof props.seed === 'number' ? props.seed : undefined}
            fallback={seedDefault(lab.type)}
            onChange={(seed) => patchLab({ seed })}
          />
        </Section>
      )}
      <Section
        title="Props"
        aside={
          <span className="ws-muted">
            {Object.keys(props).filter((k) => k !== 'seed').length} set
          </span>
        }
      >
        <PropsForm
          type={lab.type}
          props={props}
          scope={`lab:${lab.editing}`}
          onPatch={(patch) => patchLab(patch)}
        />
      </Section>
    </>
  )
}

export default function Inspector() {
  const mode = useWorkshop((s) => s.mode)
  const selection = useWorkshop((s) => s.selection)
  const world = useWorkshop((s) => s.world)
  const found = selection ? locate(world.nodes, selection) : null

  return (
    <Panel id="inspector">
      <div className="ws-inspector">
        {mode === 'lab' ? (
          <LabInspector />
        ) : found ? (
          <NodeInspector
            key={selection}
            node={found.node}
            path={found.path}
            parentId={found.parent?.id ?? null}
          />
        ) : (
          <div className="ws-empty">
            <p>Select something in the room or the outliner to tune it.</p>
            <p className="ws-muted">
              Every prop of every component is here, generated from its TypeScript. <kbd>⌘K</kbd>{' '}
              adds components, <kbd>?</kbd> shows shortcuts.
            </p>
          </div>
        )}
      </div>
    </Panel>
  )
}
