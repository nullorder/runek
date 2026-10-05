import type { JsonValue, WorldAuthor, WorldData, WorldPalette } from '@runek/core'
import {
  DEFAULT_CONTROLS,
  DEFAULT_PALETTE,
  keyLabel,
  parseClockTime,
  resolveControls,
} from '@runek/core'
import { useEffect, useRef, useState } from 'react'
import { ColorField, NumberInput, Segmented, Toggle, Vec3Input } from '../inspector/fields'
import { labelFor } from '../schema/controls'
import { setWorldField, useWorkshop } from '../state/store'
import { Panel } from './Panel'

const PALETTE_PRESETS: Record<string, Partial<WorldPalette>> = {
  Default: {},
  Dusk: {
    wall: '#a99db0',
    floor: '#7b6a73',
    foliage: '#3d5a4a',
    ground: '#2d3436',
    accent: '#e0a96d',
    sand: '#c9a77e',
    fabric: '#5b3a5e',
  },
  Autumn: {
    foliage: '#b5652b',
    bark: '#4a3326',
    ground: '#5a4a2c',
    accent: '#d9822b',
    fabric: '#8c3b20',
    wood: '#7d4f2b',
  },
  Neon: {
    accent: '#3df58a',
    metal: '#1b1f2a',
    wall: '#1d2330',
    floor: '#141824',
    fabric: '#2aa7ff',
    wood: '#2b2f3e',
    foliage: '#22c78b',
  },
  Pastel: {
    wall: '#f1e3e4',
    floor: '#e6d5c3',
    wood: '#c9a78f',
    fabric: '#b9c7e4',
    foliage: '#9cc9a1',
    roof: '#d39a9a',
    accent: '#e8b4b8',
    sand: '#f2e2c4',
  },
  Monochrome: {
    wood: '#6b6b6b',
    woodDark: '#555555',
    wall: '#c8c8c8',
    floor: '#a8a8a8',
    roof: '#7a7a7a',
    stone: '#8f8f8f',
    ground: '#3f3f3f',
    foliage: '#6d6d6d',
    bark: '#4d4d4d',
    sand: '#cfcfcf',
    fabric: '#5e5e5e',
    accent: '#e0e0e0',
    metal: '#333333',
    waterDeep: '#2b2b2b',
    waterShallow: '#707070',
  },
}

const ZONES = [
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Australia/Sydney',
  'America/New_York',
  'America/Los_Angeles',
  'America/Sao_Paulo',
]

const toClock = (minutes: number) => {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

function Group({
  title,
  children,
  open = false,
}: {
  title: string
  children: React.ReactNode
  open?: boolean
}) {
  return (
    <details className="ws-section" open={open}>
      <summary>
        <span>{title}</span>
      </summary>
      {children}
    </details>
  )
}

function TimeSection({ world }: { world: WorldData }) {
  const previewTime = useWorkshop((s) => s.previewTime)
  const [playing, setPlaying] = useState(false)
  const minutes = useRef(0)
  const pinned = world.time !== undefined
  const shown = previewTime ?? world.time
  const hours = shown
    ? (parseClockTime(shown) ?? 12)
    : new Date().getHours() + new Date().getMinutes() / 60

  useEffect(() => {
    if (!playing) return
    minutes.current = hours * 60
    const timer = setInterval(() => {
      minutes.current = (minutes.current + 4) % 1440
      useWorkshop.setState({ previewTime: toClock(minutes.current) })
    }, 33)
    return () => {
      clearInterval(timer)
      useWorkshop.setState({ previewTime: null })
    }
  }, [playing])

  const angle = ((hours - 6) / 12) * Math.PI
  return (
    <Group title="Time of day" open>
      <div className="ws-time">
        <svg viewBox="-60 -34 120 44" className="ws-sun" aria-hidden="true">
          <ellipse
            cx="0"
            cy="0"
            rx="50"
            ry="30"
            fill="none"
            stroke="#1d2b38"
            strokeDasharray="2 3"
          />
          <line x1="-58" x2="58" y1="0" y2="0" stroke="#2b4a3c" />
          <circle
            cx={-Math.cos(angle) * 50}
            cy={-Math.sin(angle) * 30}
            r="4"
            fill={Math.sin(angle) > 0 ? '#ffcf5a' : '#8fb3ff'}
          />
        </svg>
        <div className="ws-time__row">
          <input
            type="range"
            className="ws-slider"
            min={0}
            max={1439}
            step={5}
            value={Math.round(hours * 60)}
            onChange={(e) => {
              setPlaying(false)
              setWorldField('time', toClock(Number(e.target.value)), 'world:time')
            }}
          />
          <code>{shown ?? 'live'}</code>
          <button
            type="button"
            className={`ws-btn ws-btn--small ${playing ? 'is-on' : ''}`}
            title="Animate a day (preview only)"
            onClick={() => setPlaying(!playing)}
          >
            {playing ? '■' : '▶ day'}
          </button>
        </div>
        <div className="ws-field">
          <div className="ws-field__label">clock</div>
          <div className="ws-field__control">
            <Segmented
              options={['pinned', 'live']}
              value={pinned ? 'pinned' : 'live'}
              onChange={(v) =>
                setWorldField('time', v === 'pinned' ? toClock(hours * 60) : undefined)
              }
            />
          </div>
        </div>
        {!pinned && (
          <div className="ws-field">
            <div className="ws-field__label">timezone</div>
            <div className="ws-field__control">
              <input
                className="ws-text"
                list="ws-zones"
                placeholder="system"
                value={world.timezone ?? ''}
                onChange={(e) => setWorldField('timezone', e.target.value || undefined, 'world:tz')}
              />
              <datalist id="ws-zones">
                {ZONES.map((z) => (
                  <option key={z} value={z} />
                ))}
              </datalist>
            </div>
          </div>
        )}
      </div>
    </Group>
  )
}

function PaletteSection({ world }: { world: WorldData }) {
  const palette = world.palette ?? {}
  const set = (slot: keyof WorldPalette, value: string | undefined) => {
    const next: Partial<WorldPalette> = { ...palette }
    if (value === undefined) delete next[slot]
    else next[slot] = value
    setWorldField('palette', Object.keys(next).length ? next : undefined, `palette:${slot}`)
  }
  return (
    <Group title="Palette">
      <div className="ws-presets">
        {Object.entries(PALETTE_PRESETS).map(([name, preset]) => (
          <button
            key={name}
            type="button"
            className="ws-preset"
            onClick={() =>
              setWorldField('palette', Object.keys(preset).length ? { ...preset } : undefined)
            }
            title={`${name} palette`}
          >
            <span className="ws-preset__swatches">
              {(['wall', 'wood', 'foliage', 'accent', 'fabric'] as const).map((slot) => (
                <i key={slot} style={{ background: preset[slot] ?? DEFAULT_PALETTE[slot] }} />
              ))}
            </span>
            {name}
          </button>
        ))}
      </div>
      {(Object.keys(DEFAULT_PALETTE) as (keyof WorldPalette)[]).map((slot) => (
        <div key={slot} className={`ws-field ${palette[slot] ? 'is-modified' : ''}`}>
          <div className="ws-field__label">
            {palette[slot] && <i className="ws-dot" />}
            {labelFor(slot)}
            {palette[slot] && (
              <button type="button" className="ws-reset" onClick={() => set(slot, undefined)}>
                ⟲
              </button>
            )}
          </div>
          <div className="ws-field__control">
            <ColorField
              value={palette[slot]}
              fallback={DEFAULT_PALETTE[slot]}
              onChange={(v) => set(slot, v as string | undefined)}
            />
          </div>
        </div>
      ))}
    </Group>
  )
}

function FogSection({ world }: { world: WorldData }) {
  const fog = world.fog
  return (
    <Group title="Fog">
      <div className="ws-field">
        <div className="ws-field__label">fog</div>
        <div className="ws-field__control">
          <Toggle
            value={!!fog}
            onChange={(on) =>
              setWorldField('fog', on ? { color: '#9fb4c8', near: 30, far: 140 } : undefined)
            }
          />
        </div>
      </div>
      {fog && (
        <>
          <div className="ws-field">
            <div className="ws-field__label">color</div>
            <div className="ws-field__control">
              <ColorField
                value={fog.color}
                onChange={(v) =>
                  typeof v === 'string' && setWorldField('fog', { ...fog, color: v }, 'fog:color')
                }
              />
            </div>
          </div>
          <div className="ws-field">
            <div className="ws-field__label">near · far</div>
            <div className="ws-field__control ws-pair">
              <NumberInput
                value={fog.near}
                step={1}
                onChange={(near) => setWorldField('fog', { ...fog, near }, 'fog:near')}
              />
              <NumberInput
                value={fog.far}
                step={1}
                onChange={(far) => setWorldField('fog', { ...fog, far }, 'fog:far')}
              />
            </div>
          </div>
        </>
      )}
    </Group>
  )
}

function PhysicsSection({ world }: { world: WorldData }) {
  return (
    <Group title="Ground, gravity, units">
      <div className="ws-field">
        <div className="ws-field__label" title="Baseline ground level (Y)">
          ground
        </div>
        <div className="ws-field__control">
          <NumberInput
            value={world.ground ?? 0}
            step={0.1}
            onChange={(v) => setWorldField('ground', v === 0 ? undefined : v, 'world:ground')}
          />
        </div>
      </div>
      <div className="ws-field">
        <div className="ws-field__label">gravity</div>
        <Vec3Input
          value={world.gravity ?? [0, -9.81, 0]}
          onChange={(v) => setWorldField('gravity', v, 'world:gravity')}
        />
      </div>
      <div className="ws-field">
        <div className="ws-field__label" title="Meters per unit; components scale by it">
          unit
        </div>
        <div className="ws-field__control">
          <NumberInput
            value={world.unit ?? 1}
            step={0.1}
            onChange={(v) => setWorldField('unit', v === 1 || v <= 0 ? undefined : v, 'world:unit')}
          />
        </div>
      </div>
      <div className="ws-field">
        <div className="ws-field__label">avatar</div>
        <div className="ws-field__control">
          <Segmented
            options={['first', 'third', 'overhead']}
            value={world.avatar ?? 'first'}
            onChange={(v) =>
              setWorldField('avatar', v === 'first' ? undefined : (v as WorldData['avatar']))
            }
          />
        </div>
      </div>
    </Group>
  )
}

function ControlsSection({ world }: { world: WorldData }) {
  const [capturing, setCapturing] = useState<string | null>(null)
  const resolved = resolveControls(world.controls)
  useEffect(() => {
    if (!capturing) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.code !== 'Escape') {
        const next = { ...world.controls, [capturing]: e.code === 'Backspace' ? [] : [e.code] }
        setWorldField('controls', next)
      }
      setCapturing(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [capturing, world.controls])
  return (
    <Group title="Controls">
      <p className="ws-muted ws-pad">
        Click a binding, then press a key (⌫ disables, Esc cancels).
      </p>
      <div className="ws-keys">
        {Object.keys(resolved).map((action) => {
          const custom = world.controls?.[action] !== undefined
          return (
            <div key={action} className={`ws-keys__row ${custom ? 'is-modified' : ''}`}>
              <span>{labelFor(action)}</span>
              <button
                type="button"
                className={`ws-kbd ${capturing === action ? 'is-on' : ''}`}
                onClick={() => setCapturing(action)}
              >
                {capturing === action
                  ? 'press a key…'
                  : resolved[action].map(keyLabel).join(' / ') || 'off'}
              </button>
              {custom && (
                <button
                  type="button"
                  className="ws-reset"
                  onClick={() => {
                    const next = { ...world.controls }
                    delete next[action]
                    setWorldField('controls', Object.keys(next).length ? next : undefined)
                  }}
                >
                  ⟲
                </button>
              )}
            </div>
          )
        })}
      </div>
      {Object.keys(DEFAULT_CONTROLS).length < Object.keys(resolved).length && (
        <p className="ws-muted ws-pad">
          Custom actions are readable with drei's useKeyboardControls.
        </p>
      )}
    </Group>
  )
}

function TextRow({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string
  value?: string
  onChange: (v: string | undefined) => void
  placeholder?: string
  multiline?: boolean
}) {
  return (
    <div className="ws-field">
      <div className="ws-field__label">{label}</div>
      <div className="ws-field__control">
        {multiline ? (
          <textarea
            className="ws-text"
            rows={2}
            value={value ?? ''}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value || undefined)}
          />
        ) : (
          <input
            className="ws-text"
            value={value ?? ''}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value || undefined)}
          />
        )}
      </div>
    </div>
  )
}

function MetaSection({ world }: { world: WorldData }) {
  const meta = world.meta ?? {}
  const set = (key: string, value: JsonValue | undefined) => {
    const next: Record<string, JsonValue> = { ...(meta as Record<string, JsonValue>) }
    if (value === undefined) delete next[key]
    else next[key] = value
    setWorldField('meta', Object.keys(next).length ? next : undefined, `meta:${key}`)
  }
  const source = meta.source ?? { url: '' }
  const setSource = (key: string, value: string | undefined) => {
    const next: Record<string, string> = { ...(source as unknown as Record<string, string>) }
    if (value === undefined) delete next[key]
    else next[key] = value
    set('source', next.url ? next : undefined)
  }
  const authors = meta.authors ?? []
  return (
    <Group title="Identity (meta)">
      <TextRow label="title" value={meta.title} onChange={(v) => set('title', v)} />
      <TextRow
        label="description"
        value={meta.description}
        multiline
        onChange={(v) => set('description', v)}
      />
      <TextRow
        label="license"
        value={meta.license}
        placeholder="CC-BY-4.0"
        onChange={(v) => set('license', v)}
      />
      <div className="ws-field is-wide">
        <div className="ws-field__label">authors</div>
        <div className="ws-list">
          {authors.map((a: WorldAuthor, i: number) => (
            <div key={i} className="ws-pair">
              <input
                className="ws-text"
                placeholder="name"
                value={a.name}
                onChange={(e) =>
                  set(
                    'authors',
                    authors.map((x, j) =>
                      j === i ? { ...x, name: e.target.value } : x,
                    ) as unknown as JsonValue,
                  )
                }
              />
              <input
                className="ws-text"
                placeholder="url"
                value={a.url ?? ''}
                onChange={(e) =>
                  set(
                    'authors',
                    authors.map((x, j) =>
                      j === i ? { ...x, url: e.target.value || undefined } : x,
                    ) as unknown as JsonValue,
                  )
                }
              />
              <button
                type="button"
                className="ws-icon"
                onClick={() =>
                  set(
                    'authors',
                    authors.length > 1
                      ? (authors.filter((_, j) => j !== i) as unknown as JsonValue)
                      : undefined,
                  )
                }
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="ws-btn ws-btn--small"
            onClick={() => set('authors', [...authors, { name: '' }] as unknown as JsonValue)}
          >
            + author
          </button>
        </div>
      </div>
      <TextRow
        label="repo url"
        value={source.url || undefined}
        placeholder="https://github.com/you/world"
        onChange={(v) => setSource('url', v)}
      />
      {source.url && (
        <TextRow
          label="file path"
          value={source.path}
          placeholder="public/world.json"
          onChange={(v) => setSource('path', v)}
        />
      )}
    </Group>
  )
}

function FontsSection({ world }: { world: WorldData }) {
  const fonts = world.fonts ?? {}
  const set = (role: 'display' | 'body', value: string | undefined) => {
    const next = { ...fonts }
    if (value === undefined) delete next[role]
    else next[role] = value
    setWorldField('fonts', Object.keys(next).length ? next : undefined, `fonts:${role}`)
  }
  return (
    <Group title="Fonts">
      <TextRow
        label="display"
        value={fonts.display}
        placeholder="bundled Pixelspace"
        onChange={(v) => set('display', v)}
      />
      <TextRow
        label="body"
        value={fonts.body}
        placeholder="bundled Pixelspace"
        onChange={(v) => set('body', v)}
      />
      <p className="ws-muted ws-pad">
        A .woff/.ttf URL per role. Text components (Sign, labels) draw from these.
      </p>
    </Group>
  )
}

export default function WorldPanel() {
  const world = useWorkshop((s) => s.world)
  return (
    <Panel id="world">
      <div className="ws-worldpanel">
        <TimeSection world={world} />
        <PaletteSection world={world} />
        <FogSection world={world} />
        <PhysicsSection world={world} />
        <ControlsSection world={world} />
        <FontsSection world={world} />
        <MetaSection world={world} />
      </div>
    </Panel>
  )
}
