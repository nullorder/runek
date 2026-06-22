import { type CSSProperties, useEffect, useState } from 'react'
import type { WorldMeta } from './world-data'

export interface WorldAboutProps {
  /** The world's identity. When absent, the panel shows a minimal "untitled world". */
  meta?: WorldMeta
}

/**
 * A small `ⓘ` affordance that opens a read-only "About this world" panel over the
 * canvas. A pure view of `meta` (title, description, authors, license, source repo)
 * plus a "built with Runek" tag. Surfaced in both walk (`WorldRenderer`) and edit
 * (`WorldEditor`) modes — a visitor wants to know whose world it is and how it is
 * licensed, not just an editor.
 */
export function WorldAbout({ meta }: WorldAboutProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const title = meta?.title?.trim() || 'Untitled world'
  const authors = meta?.authors ?? []
  const source = meta?.source

  return (
    <>
      <button
        type="button"
        style={INFO_BTN}
        onClick={() => setOpen(true)}
        title="About this world"
        aria-label="About this world"
      >
        ⓘ
      </button>

      {open && (
        <div style={OVERLAY} role="dialog" aria-modal="true" aria-label="About this world">
          <button type="button" style={SCRIM} aria-label="Close" onClick={() => setOpen(false)} />
          <div style={CARD}>
            <button type="button" style={CLOSE} onClick={() => setOpen(false)} aria-label="Close">
              ×
            </button>

            <h2 style={TITLE}>{title}</h2>
            {meta?.description && <p style={DESC}>{meta.description}</p>}

            {authors.length > 0 && (
              <p style={ROW}>
                <span style={LABEL}>by </span>
                {authors.map((author, index) => (
                  <span key={`${author.name}-${index}`}>
                    {index > 0 && ', '}
                    {author.url ? (
                      <a style={LINK} href={author.url} target="_blank" rel="noreferrer">
                        {author.name}
                      </a>
                    ) : (
                      author.name
                    )}
                  </span>
                ))}
              </p>
            )}

            {meta?.license && (
              <p style={ROW}>
                <span style={LABEL}>license </span>
                {meta.license}
              </p>
            )}

            {source?.url && (
              <p style={ROW}>
                <a style={LINK} href={source.url} target="_blank" rel="noreferrer">
                  View source repository ↗
                </a>
              </p>
            )}

            <p style={BUILT}>
              <a
                style={BUILT_LINK}
                href="https://runek.nullorder.org"
                target="_blank"
                rel="noreferrer"
              >
                Built with Runek
              </a>
            </p>
          </div>
        </div>
      )}
    </>
  )
}

const MONO = 'ui-monospace, SF Mono, Menlo, monospace'
const PANEL_BG = 'rgba(7, 11, 17, 0.95)'
const BORDER = '#15202a'

const INFO_BTN: CSSProperties = {
  position: 'fixed',
  top: '1rem',
  right: '1rem',
  zIndex: 10,
  width: 32,
  height: 32,
  borderRadius: '50%',
  border: `1px solid ${BORDER}`,
  background: 'rgba(7, 11, 17, 0.82)',
  color: '#cfe6db',
  backdropFilter: 'blur(8px)',
  cursor: 'pointer',
  fontSize: '0.95rem',
  lineHeight: 1,
  fontFamily: MONO,
}

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
  maxWidth: 420,
  padding: '1.5rem 1.6rem',
  borderRadius: 12,
  background: PANEL_BG,
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
  color: '#3df58a',
}

const DESC: CSSProperties = {
  margin: '0 0 0.9rem',
  fontSize: '0.85rem',
  lineHeight: 1.5,
}

const ROW: CSSProperties = {
  margin: '0 0 0.4rem',
  fontSize: '0.8rem',
}

const LABEL: CSSProperties = { color: '#5f7d75' }
const LINK: CSSProperties = { color: '#2aa7ff', textDecoration: 'none' }

const BUILT: CSSProperties = {
  margin: '1.1rem 0 0',
  paddingTop: '0.8rem',
  borderTop: `1px solid ${BORDER}`,
  fontSize: '0.72rem',
  color: '#5f7d75',
}

const BUILT_LINK: CSSProperties = { color: '#5f7d75', textDecoration: 'none' }
