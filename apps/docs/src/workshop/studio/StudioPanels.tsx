import { useRef } from 'react'
import { Panel } from '../panels/Panel'
import {
  leaveStudio,
  newStudioFigure,
  revertStudio,
  type StudioAngle,
  type StudioLight,
  setStudio,
  useWorkshop,
} from '../state/store'
import { AvatarPanel } from './AvatarPanel'
import {
  addFigureToScene,
  copyJsx,
  copyNode,
  exportLook,
  importLook,
  studioTarget,
  useAsAvatar,
} from './actions'
import { Choice, StudioProvider } from './controls'

const ANGLES: [StudioAngle, string][] = [
  ['front', 'front'],
  ['three', '¾'],
  ['side', 'side'],
  ['back', 'back'],
]
const LIGHTS: StudioLight[] = ['studio', 'warm', 'dusk', 'night']

function StudioPanel() {
  const studio = useWorkshop((s) => s.studio)
  useWorkshop((s) => s.world)
  const target = studioTarget()
  const file = useRef<HTMLInputElement>(null)
  const changed =
    target && studio.original && JSON.stringify(target.props) !== JSON.stringify(studio.original)

  return (
    <Panel id="studio">
      <div className="ws-studio">
        <div className="ws-studio__who">
          {target ? (
            <>
              <strong>Person</strong> <code className="ws-muted">{target.id}</code>
              <p className="ws-muted">Edits land on the figure in your scene as you make them.</p>
            </>
          ) : (
            <>
              <strong>A new figure</strong>
              <p className="ws-muted">Not in your scene yet. Customise it, then add it.</p>
            </>
          )}
        </div>
        <div className="ws-studio__actions">
          {target ? (
            <button
              type="button"
              className="ws-btn ws-btn--small"
              disabled={!changed}
              title="Undo every change since you came in"
              onClick={revertStudio}
            >
              revert
            </button>
          ) : (
            <button
              type="button"
              className="ws-btn ws-btn--small ws-btn--primary"
              onClick={addFigureToScene}
            >
              add to scene
            </button>
          )}
          <button
            type="button"
            className="ws-btn ws-btn--small"
            title="Start a new figure from a random seed"
            onClick={() => newStudioFigure()}
          >
            new figure
          </button>
          <button
            type="button"
            className="ws-btn ws-btn--small"
            title="Give the play avatar (the world's Player body) this look"
            onClick={useAsAvatar}
          >
            use as play avatar
          </button>
          <button
            type="button"
            className="ws-btn ws-btn--small ws-btn--primary"
            onClick={leaveStudio}
          >
            done
          </button>
        </div>

        <h4>View</h4>
        <Choice
          options={ANGLES.map(([, label]) => label)}
          value={ANGLES.find(([id]) => id === studio.angle)?.[1]}
          onPick={(label) =>
            setStudio({ angle: ANGLES.find(([, l]) => l === label)?.[0] ?? 'three' })
          }
        />
        <Choice
          options={LIGHTS}
          value={studio.light}
          onPick={(light) => setStudio({ light: light as StudioLight })}
        />
        <label className="ws-checkline">
          <input
            type="checkbox"
            checked={studio.turntable}
            onChange={(e) => setStudio({ turntable: e.target.checked })}
          />
          turntable
        </label>
        {studio.seeds && (
          <div className="ws-avatar__row">
            <button
              type="button"
              className="ws-btn ws-btn--small"
              disabled={studio.seedBase <= 1}
              onClick={() => setStudio({ seedBase: Math.max(1, studio.seedBase - 9) })}
            >
              ‹ seeds
            </button>
            <span className="ws-muted">
              {studio.seedBase}–{studio.seedBase + 8}
            </span>
            <button
              type="button"
              className="ws-btn ws-btn--small"
              onClick={() => setStudio({ seedBase: studio.seedBase + 9 })}
            >
              seeds ›
            </button>
          </div>
        )}

        <h4>Look file</h4>
        <div className="ws-studio__actions">
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

/** The avatar studio's panels: the studio controls on the left, the avatar editor on the right. */
export default function StudioPanels() {
  return (
    <StudioProvider>
      <StudioPanel />
      <AvatarPanel />
    </StudioProvider>
  )
}
