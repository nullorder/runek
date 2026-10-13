import { type ResolvedGarment, resolvePerson } from '@runek/components'
import type { JsonValue } from '@runek/core/data'
import { useState } from 'react'
import { Choice, defOptions, Slider, Swatches, Tiles, useStudio } from './controls'
import { FASHION } from './swatches'

type Garment = Record<string, JsonValue> & { type: string }

const REGION: Record<string, 'top' | 'bottom' | 'feet' | 'extra'> = {
  tshirt: 'top',
  shirt: 'top',
  sweater: 'top',
  hoodie: 'top',
  blazer: 'top',
  vest: 'top',
  tunic: 'top',
  coat: 'top',
  dress: 'top',
  robe: 'top',
  apron: 'top',
  trousers: 'bottom',
  jeans: 'bottom',
  shorts: 'bottom',
  skirt: 'bottom',
  shoes: 'feet',
  boots: 'feet',
}
const regionOf = (type: string) => REGION[type] ?? 'extra'
const GROUPS = ['top', 'bottom', 'feet', 'extra'] as const

/** A garment's settled options with nothing set, to keep written layers minimal. */
const defaultsOf = (type: string) =>
  resolvePerson({ clothes: [{ type } as never] }).clothes.value[0] as ResolvedGarment

/** A resolved layer as the fewest keys that rebuild it (colors stay with the flat color props). */
function minimal(layer: ResolvedGarment): Garment {
  const d = defaultsOf(layer.type)
  const out: Garment = { type: layer.type }
  for (const field of ['sleeves', 'neck', 'length'] as const)
    if (layer[field] !== d[field]) out[field] = layer[field]
  return out
}

const MANNEQUIN = { seed: 5, gender: 'neutral', skinTone: '#d9d4ca', hair: 'bald' }

/** The clothes, inner to outer: the order decides the fit (a top before the trousers is tucked
 *  in), so rows drag to reorder, and the badge shows what tucks. */
export function LayerStack() {
  const { props, resolved, palette, write } = useStudio()
  const [open, setOpen] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [dragging, setDragging] = useState<number | null>(null)
  const layers = resolved.clothes.value
  const explicit = Array.isArray(props.clothes) ? (props.clothes as Garment[]) : null
  const list = (): Garment[] => (explicit ? explicit.map((g) => ({ ...g })) : layers.map(minimal))
  const commit = (next: Garment[], key?: string) => write('clothes', next, key)

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= layers.length) return
    const next = list()
    const [g] = next.splice(from, 1)
    next.splice(to, 0, g)
    commit(next)
    setOpen(null)
  }
  const patch = (i: number, field: string, value: JsonValue | undefined, key?: string) => {
    const next = list()
    if (value === undefined) delete next[i][field]
    else next[i][field] = value
    commit(next, key)
  }
  const sleeves = defOptions('PersonGarment', 'sleeves')
  const necks = defOptions('PersonGarment', 'neck')
  const types = defOptions('PersonGarment', 'type')
  const slots = [palette.fabric, palette.accent, palette.wall, palette.woodDark, palette.stone]

  return (
    <div className="ws-layers">
      {layers.length === 0 && (
        <p className="ws-muted ws-pad">No clothes: the bare base body, a smooth mannequin.</p>
      )}
      <ol className="ws-layers__list">
        {layers.map((layer, i) => {
          const own = explicit?.[i]?.color
          return (
            <li
              key={i}
              className={`ws-layer ${dragging === i ? 'is-dragging' : ''}`}
              draggable
              onDragStart={(e) => {
                setDragging(i)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragEnd={() => setDragging(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (dragging !== null) move(dragging, i)
                setDragging(null)
              }}
            >
              <div className="ws-layer__row">
                <span className="ws-layer__grip" aria-hidden="true">
                  ⋮⋮
                </span>
                <span className="ws-layer__chip" style={{ background: layer.color }} />
                <button
                  type="button"
                  className="ws-layer__name"
                  aria-expanded={open === i}
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  {layer.type}
                  <small>{regionOf(layer.type)}</small>
                </button>
                {layer.tucked && (
                  <span className="ws-src is-default" title="Tucked into a bottom listed after it">
                    tucked
                  </span>
                )}
                <span className="ws-layer__tools">
                  <button
                    type="button"
                    className="ws-icon"
                    title="Move inward"
                    disabled={i === 0}
                    onClick={() => move(i, i - 1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="ws-icon"
                    title="Move outward"
                    disabled={i === layers.length - 1}
                    onClick={() => move(i, i + 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="ws-icon"
                    title="Take it off"
                    onClick={() => {
                      const next = list()
                      next.splice(i, 1)
                      commit(next)
                      setOpen(null)
                    }}
                  >
                    ✕
                  </button>
                </span>
              </div>
              {open === i && (
                <div className="ws-layer__options">
                  <div className="ws-layer__field">
                    <span>color</span>
                    <Swatches
                      colors={[...FASHION, ...slots]}
                      value={typeof own === 'string' ? own : layer.color}
                      onPick={(c) => patch(i, 'color', c, `studio:layer:${i}:color`)}
                    />
                    {own !== undefined && (
                      <button
                        type="button"
                        className="ws-link"
                        onClick={() => patch(i, 'color', undefined)}
                      >
                        use the outfit color
                      </button>
                    )}
                  </div>
                  {regionOf(layer.type) === 'top' && (
                    <>
                      <div className="ws-layer__field">
                        <span>sleeves</span>
                        <Choice
                          options={sleeves}
                          value={layer.sleeves}
                          onPick={(v) => patch(i, 'sleeves', v)}
                        />
                      </div>
                      <div className="ws-layer__field">
                        <span>neck</span>
                        <Choice
                          options={necks}
                          value={layer.neck}
                          onPick={(v) => patch(i, 'neck', v)}
                        />
                      </div>
                    </>
                  )}
                  <div className="ws-layer__field">
                    <span>length</span>
                    <Slider
                      value={layer.length}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(n) => patch(i, 'length', n, `studio:layer:${i}:length`)}
                    />
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ol>
      <div className="ws-layers__actions">
        <button
          type="button"
          className={`ws-btn ws-btn--small ${adding ? 'is-on' : ''}`}
          onClick={() => setAdding(!adding)}
        >
          ＋ add a layer
        </button>
        {explicit && (
          <button
            type="button"
            className="ws-btn ws-btn--small"
            title="Drop the custom stack and wear the outfit again"
            onClick={() => write('clothes', undefined)}
          >
            back to the outfit
          </button>
        )}
        {layers.length > 0 && (
          <button
            type="button"
            className="ws-btn ws-btn--small"
            title="Take everything off"
            onClick={() => commit([])}
          >
            bare
          </button>
        )}
      </div>
      {adding &&
        GROUPS.map((group) => {
          const options = types.filter((t) => regionOf(t) === group)
          if (!options.length) return null
          return (
            <div key={group} className="ws-layers__add">
              <h4>{group}</h4>
              <Tiles
                options={options}
                value={null}
                small
                base={MANNEQUIN}
                props={(type) => ({ clothes: [{ type }] })}
                onPick={(type) => {
                  commit([...list(), { type }])
                  setOpen(layers.length)
                }}
              />
            </div>
          )
        })}
      <p className="ws-field__doc">
        Inner to outer. A top above a bottom in this list is tucked into it; one below hangs over
        it. Each layer stands just proud of the ones under it, so any stack fits any body.
      </p>
    </div>
  )
}
