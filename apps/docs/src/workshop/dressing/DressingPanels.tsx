import { useRef } from 'react'
import { Panel } from '../panels/Panel'
import {
  type DressAngle,
  type DressLight,
  leaveDressing,
  newDressFigure,
  revertDress,
  setDress,
  useWorkshop,
} from '../state/store'
import { AvatarPanel } from './AvatarPanel'
import {
  addDressToScene,
  copyJsx,
  copyNode,
  dressTarget,
  exportLook,
  importLook,
  useAsAvatar,
} from './actions'
import { Choice, DressProvider } from './controls'

const ANGLES: [DressAngle, string][] = [
  ['front', 'front'],
  ['three', '¾'],
  ['side', 'side'],
  ['back', 'back'],
]
const LIGHTS: DressLight[] = ['studio', 'warm', 'dusk', 'night']

function FittingPanel() {
  const dress = useWorkshop((s) => s.dress)
  useWorkshop((s) => s.world)
  const target = dressTarget()
  const file = useRef<HTMLInputElement>(null)
  const changed =
    target && dress.original && JSON.stringify(target.props) !== JSON.stringify(dress.original)

  return (
    <Panel id="fitting">
      <div className="ws-fitting">
        <div className="ws-fitting__who">
          {target ? (
            <>
              <strong>Person</strong> <code className="ws-muted">{target.id}</code>
              <p className="ws-muted">Edits land on the figure in your scene as you make them.</p>
            </>
          ) : (
            <>
              <strong>A new figure</strong>
              <p className="ws-muted">Not in your scene yet. Dress it, then add it.</p>
            </>
          )}
        </div>
        <div className="ws-fitting__actions">
          {target ? (
            <button
              type="button"
              className="ws-btn ws-btn--small"
              disabled={!changed}
              title="Undo every change since you came in"
              onClick={revertDress}
            >
              revert
            </button>
          ) : (
            <button
              type="button"
              className="ws-btn ws-btn--small ws-btn--primary"
              onClick={addDressToScene}
            >
              add to scene
            </button>
          )}
          <button
            type="button"
            className="ws-btn ws-btn--small"
            title="Start a new figure from a random seed"
            onClick={() => newDressFigure()}
          >
            new figure
          </button>
          <button
            type="button"
            className="ws-btn ws-btn--small"
            title="Dress the play avatar (the world's Player body) in this look"
            onClick={useAsAvatar}
          >
            use as play avatar
          </button>
          <button
            type="button"
            className="ws-btn ws-btn--small ws-btn--primary"
            onClick={leaveDressing}
          >
            done
          </button>
        </div>

        <h4>View</h4>
        <Choice
          options={ANGLES.map(([, label]) => label)}
          value={ANGLES.find(([id]) => id === dress.angle)?.[1]}
          onPick={(label) =>
            setDress({ angle: ANGLES.find(([, l]) => l === label)?.[0] ?? 'three' })
          }
        />
        <Choice
          options={LIGHTS}
          value={dress.light}
          onPick={(light) => setDress({ light: light as DressLight })}
        />
        <label className="ws-checkline">
          <input
            type="checkbox"
            checked={dress.turntable}
            onChange={(e) => setDress({ turntable: e.target.checked })}
          />
          turntable
        </label>
        {dress.seeds && (
          <div className="ws-dress__row">
            <button
              type="button"
              className="ws-btn ws-btn--small"
              disabled={dress.seedBase <= 1}
              onClick={() => setDress({ seedBase: Math.max(1, dress.seedBase - 9) })}
            >
              ‹ seeds
            </button>
            <span className="ws-muted">
              {dress.seedBase}–{dress.seedBase + 8}
            </span>
            <button
              type="button"
              className="ws-btn ws-btn--small"
              onClick={() => setDress({ seedBase: dress.seedBase + 9 })}
            >
              seeds ›
            </button>
          </div>
        )}

        <h4>Look file</h4>
        <div className="ws-fitting__actions">
          <button
            type="button"
            className="ws-btn ws-btn--small"
            title="Download this look as JSON (a Person node)"
            onClick={exportLook}
          >
            export .look.json
          </button>
          <button
            type="button"
            className="ws-btn ws-btn--small"
            title="Wear a look from a .look.json file"
            onClick={() => file.current?.click()}
          >
            import…
          </button>
          <input
            ref={file}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importLook(f)
              e.target.value = ''
            }}
          />
          <button type="button" className="ws-btn ws-btn--small" onClick={copyJsx}>
            copy JSX
          </button>
          <button type="button" className="ws-btn ws-btn--small" onClick={copyNode}>
            copy node
          </button>
        </div>
        <p className="ws-field__doc">
          A look is the figure's identity and clothes (seed, body, face, hair, outfit), not where it
          stands or what it does.
        </p>
      </div>
    </Panel>
  )
}

/** The dressing room's panels: the fitting controls on the left, the avatar editor on the right. */
export default function DressingPanels() {
  return (
    <DressProvider>
      <FittingPanel />
      <AvatarPanel />
    </DressProvider>
  )
}
