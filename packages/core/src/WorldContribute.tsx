import { type CSSProperties, type ReactNode, useEffect } from 'react'
import { editFileUrl, forkUrl, parseGitHubSource } from './contribute'
import { serializeWorld, type WorldData } from './world-data'

export interface WorldContributeProps {
  /** The edited world. Its `meta.source` drives the GitHub URLs; its content is the download. */
  data: WorldData
  onClose: () => void
}

function downloadHref(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
}

function downloadText(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  downloadHref(url, filename)
  URL.revokeObjectURL(url)
}

/** Grab the world canvas as a PNG data URL. Needs `preserveDrawingBuffer` on the
 *  WebGL context (the editor enables it); returns null if the buffer was cleared. */
function captureSnapshot(): string | null {
  const canvas = document.querySelector('canvas')
  if (!canvas) return null
  try {
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

/**
 * "Suggest changes upstream": a modal that couriers the edited world to GitHub's own
 * UI with no account, token, or backend. Runek downloads the edited JSON + a snapshot,
 * then opens GitHub's edit-file URL (which auto-forks for non-collaborators); the modal
 * copy walks paste → commit → PR. Non-GitHub hosts fall back to opening the repo.
 */
export function WorldContribute({ data, onClose }: WorldContributeProps) {
  const source = data.meta?.source
  const gh = parseGitHubSource(source)
  const editUrl = gh ? editFileUrl(gh) : null

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const downloadJson = () => downloadText(serializeWorld(data), 'world.json')
  const downloadSnapshot = () => {
    const png = captureSnapshot()
    if (png) downloadHref(png, 'world-snapshot.png')
  }
  const open = (url: string) => window.open(url, '_blank', 'noopener,noreferrer')

  return (
    <div style={OVERLAY} role="dialog" aria-modal="true" aria-label="Contribute this world">
      <button type="button" style={SCRIM} aria-label="Close" onClick={onClose} />
      <div style={CARD}>
        <button type="button" style={CLOSE} onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2 style={TITLE}>Contribute this world</h2>
        <p style={INTRO}>
          Runek hands your edit to GitHub directly, no account or token needed. Your change becomes
          a normal pull request the world's owner reviews.
        </p>

        {gh ? (
          <>
            <button type="button" style={SECONDARY} onClick={() => open(forkUrl(gh))}>
              Fork this world ↗
            </button>
            <p style={HINT}>Get your own deployable copy to build on.</p>

            <div style={DIVIDER} />

            <ol style={STEPS}>
              <Step n={1}>
                Download your edits and a snapshot of this view.
                <div style={ACTIONS}>
                  <button type="button" style={PRIMARY} onClick={downloadJson}>
                    Download world.json
                  </button>
                  <button type="button" style={PRIMARY} onClick={downloadSnapshot}>
                    Download snapshot.png
                  </button>
                </div>
              </Step>
              <Step n={2}>
                Open the world file on GitHub (it forks the repo for you automatically).
                <div style={ACTIONS}>
                  {editUrl ? (
                    <button type="button" style={PRIMARY} onClick={() => open(editUrl)}>
                      Open GitHub editor →
                    </button>
                  ) : (
                    <button
                      type="button"
                      style={PRIMARY}
                      onClick={() => source && open(source.url)}
                    >
                      Open repository ↗
                    </button>
                  )}
                </div>
                {!editUrl && (
                  <span style={NOTE}>
                    The world's file path isn't set in <code>meta.source.path</code>, so open the
                    repo and edit the world file directly.
                  </span>
                )}
              </Step>
              <Step n={3}>
                In GitHub's editor: select all, paste the downloaded JSON, and commit to a new
                branch.
              </Step>
              <Step n={4}>
                GitHub offers “Propose changes” → open the pull request. Attach the snapshot so the
                owner can see the change a JSON diff can't show.
              </Step>
            </ol>
          </>
        ) : (
          <>
            <p style={INTRO}>
              This world's repository isn't on GitHub. Download your changes and open the repo to
              contribute however it accepts them.
            </p>
            <div style={ACTIONS}>
              <button type="button" style={PRIMARY} onClick={downloadJson}>
                Download world.json
              </button>
              {source?.url && (
                <button type="button" style={PRIMARY} onClick={() => open(source.url)}>
                  Open repository ↗
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li style={STEP}>
      <span style={STEP_NUM}>{n}</span>
      <div>{children}</div>
    </li>
  )
}

const MONO = 'ui-monospace, SF Mono, Menlo, monospace'
const BORDER = '#15202a'
const GREEN = '#3df58a'

const OVERLAY: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1rem',
}

const SCRIM: CSSProperties = {
  position: 'absolute',
  inset: 0,
  border: 'none',
  padding: 0,
  margin: 0,
  background: 'rgba(3, 5, 10, 0.6)',
  backdropFilter: 'blur(2px)',
  cursor: 'default',
}

const CARD: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  width: '100%',
  maxWidth: 480,
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: '1.5rem 1.6rem',
  borderRadius: 12,
  background: 'rgba(7, 11, 17, 0.97)',
  border: `1px solid ${BORDER}`,
  color: '#cfe6db',
  fontFamily: MONO,
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
}

const CLOSE: CSSProperties = {
  position: 'absolute',
  top: '0.7rem',
  right: '0.8rem',
  border: 'none',
  background: 'transparent',
  color: '#5f7d75',
  cursor: 'pointer',
  fontSize: '1.1rem',
  lineHeight: 1,
  fontFamily: MONO,
}

const TITLE: CSSProperties = {
  margin: '0 0 0.5rem',
  fontSize: '1.15rem',
  fontWeight: 600,
  color: GREEN,
}

const INTRO: CSSProperties = {
  margin: '0 0 1rem',
  fontSize: '0.82rem',
  lineHeight: 1.5,
  color: '#cfe6db',
}

const HINT: CSSProperties = {
  margin: '0.35rem 0 0',
  fontSize: '0.72rem',
  color: '#5f7d75',
}

const NOTE: CSSProperties = {
  display: 'block',
  marginTop: '0.4rem',
  fontSize: '0.72rem',
  color: '#5f7d75',
}

const DIVIDER: CSSProperties = {
  height: 1,
  margin: '1.1rem 0',
  background: BORDER,
}

const STEPS: CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.9rem',
}

const STEP: CSSProperties = {
  display: 'flex',
  gap: '0.6rem',
  fontSize: '0.82rem',
  lineHeight: 1.5,
}

const STEP_NUM: CSSProperties = {
  flex: '0 0 auto',
  width: 20,
  height: 20,
  borderRadius: '50%',
  border: `1px solid ${GREEN}`,
  color: GREEN,
  fontSize: '0.72rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: '0.05rem',
}

const ACTIONS: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.4rem',
  marginTop: '0.5rem',
}

const PRIMARY: CSSProperties = {
  padding: '0.35rem 0.65rem',
  borderRadius: 6,
  border: `1px solid rgba(61, 245, 138, 0.5)`,
  background: 'rgba(61, 245, 138, 0.14)',
  color: GREEN,
  cursor: 'pointer',
  fontSize: '0.76rem',
  fontFamily: MONO,
}

const SECONDARY: CSSProperties = {
  padding: '0.4rem 0.7rem',
  borderRadius: 6,
  border: `1px solid ${BORDER}`,
  background: 'rgba(255, 255, 255, 0.04)',
  color: '#cfe6db',
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontFamily: MONO,
}
