import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useWorld, type WorldComponentProps } from '@runek/core'
import { useRef } from 'react'
import { type Group, Vector3 } from 'three'

export interface CompassProps extends WorldComponentProps {
  /** Screen corner the dial sits in. */
  corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /** Dial diameter, in CSS px (shrinks ~22% on narrow viewports). */
  size?: number
  /** Inset from the corner edges, in CSS px `[x, y]`. */
  inset?: [number, number]
  /** Show the wind + bearing readout pill under the dial. */
  readout?: boolean
  /**
   * World yaw (radians) the dial reads as north, using the same convention as `Player`/`Helm`
   * yaw: 0 faces +Z, so the default makes +Z north (and -X east).
   */
  north?: number
  /** North needle + north letter color. Compass-north red; no palette slot fits. */
  accentColor?: string
}

// The dial is drawn in a fixed 200x200 viewBox and scaled by the `size` prop.
const CX = 100
const CY = 100

/** Point at radius r, angle deg (0 at twelve o'clock, clockwise). */
function xy(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180
  return [+(CX + r * Math.cos(a)).toFixed(2), +(CY + r * Math.sin(a)).toFixed(2)]
}

function pt(r: number, deg: number): string {
  const [x, y] = xy(r, deg)
  return `${x},${y}`
}

/** A rose point split into its classic shaded/lit halves. */
function rosePoint(deg: number, len: number, w: number) {
  const tip = pt(len, deg)
  const center = `${CX},${CY}`
  return {
    dark: `${center} ${pt(w, deg - 90)} ${tip}`,
    light: `${center} ${pt(w, deg + 90)} ${tip}`,
  }
}

const CARDINALS = [0, 90, 180, 270].map((deg) => ({ deg, ...rosePoint(deg, 56, 8) }))
const INTERCARDINALS = [45, 135, 225, 315].map((deg) => ({ deg, ...rosePoint(deg, 38, 5.5) }))
const TICKS = Array.from({ length: 24 }, (_, i) => i * 15)
const LETTER_ANGLES = [0, 90, 180, 270] as const
const LETTER_CHARS = ['N', 'E', 'S', 'W'] as const
const WINDS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

const DIR = new Vector3()

const CORNER_INSETS: Record<NonNullable<CompassProps['corner']>, [string, string]> = {
  'top-left': ['top', 'left'],
  'top-right': ['top', 'right'],
  'bottom-left': ['bottom', 'left'],
  'bottom-right': ['bottom', 'right'],
}

/**
 * A screen-fixed HUD compass: a glassy dial (translucent ring, classic split-half rose
 * needles, cardinal markers, a fixed lubber line at twelve o'clock) floating in a corner of
 * the canvas, with an optional wind + bearing readout pill. Like a ship's binnacle compass,
 * the rose card swings while the ring and lubber line stay fixed — whatever cardinal sits
 * under the pointer is the way you're facing.
 *
 * The heading is read from the camera every frame, which covers any traversal scheme that
 * drives the camera (an ecctrl `Player` on foot, a chase-cam vehicle). The card rotates by
 * direct DOM mutation, so per-frame updates never re-render React. Rendered via drei `Html`
 * into the canvas wrapper — purely informational, it never intercepts pointer events.
 */
export function Compass({
  corner = 'bottom-left',
  size = 108,
  inset = [16, 16],
  readout = true,
  north = 0,
  accentColor = '#c0392b',
}: CompassProps) {
  const { fonts } = useWorld()
  const camera = useThree((s) => s.camera)

  const anchor = useRef<Group>(null)
  const card = useRef<SVGGElement>(null)
  const readoutEl = useRef<HTMLSpanElement>(null)
  const shown = useRef(-1)

  useFrame(() => {
    camera.getWorldDirection(DIR)
    // Keep the Html anchor just ahead of the camera so drei's behind-camera check (which
    // runs if the projected position ever shifts, e.g. on a resize) can never hide the dial.
    if (anchor.current) {
      anchor.current.position.copy(camera.position).addScaledVector(DIR, 1)
    }
    // drei's Html renders its content in its own DOM root, so the refs attach a beat after
    // the first frames — don't consume a heading until the card exists to receive it.
    if (!card.current) return
    const heading = north - Math.atan2(DIR.x, DIR.z)
    const deg = ((((heading * 180) / Math.PI) % 360) + 360) % 360
    if (Math.abs(deg - shown.current) < 0.02) return
    shown.current = deg
    // The card counter-rotates so the cardinal you face lands under the lubber line.
    card.current.setAttribute('transform', `rotate(${(-deg).toFixed(2)} ${CX} ${CY})`)
    if (readoutEl.current) {
      const text = `${WINDS[Math.round(deg / 45) % 8]} ${String(Math.round(deg) % 360).padStart(3, '0')}°`
      if (readoutEl.current.textContent !== text) readoutEl.current.textContent = text
    }
  })

  const [vSide, hSide] = CORNER_INSETS[corner]
  const dialClass = `runek-compass--${corner}`

  return (
    <group ref={anchor}>
      <Html
        // Pin the wrapper to the canvas center; with `fullscreen` the inner div then covers
        // the canvas exactly, and the constant position keeps drei's per-frame work dormant.
        calculatePosition={(_el, _camera, htmlSize) => [htmlSize.width / 2, htmlSize.height / 2]}
        fullscreen
        // A HUD is never occluded: absorb drei's behind-camera callback so it can't latch
        // `display: none` during the first frames while the camera controller settles.
        onOcclude={() => null}
        style={{ pointerEvents: 'none' }}
        zIndexRange={[10, 0]}
      >
        <style>{`
          @font-face {
            font-family: 'RunekCompass';
            src: url('${fonts.display}');
            font-display: swap;
          }
          .${dialClass} svg {
            width: ${size}px;
            height: ${size}px;
            filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
          }
          @media (max-width: 640px) {
            .${dialClass} svg {
              width: ${Math.round(size * 0.78)}px;
              height: ${Math.round(size * 0.78)}px;
            }
          }
        `}</style>
        <div
          className={dialClass}
          aria-hidden="true"
          style={{
            position: 'absolute',
            [vSide]: inset[1],
            [hSide]: inset[0],
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <svg viewBox="0 0 200 200" role="presentation">
            {/* Glass ring: a translucent brass band between two white hairlines. */}
            <circle
              cx={CX}
              cy={CY}
              r="91"
              fill="none"
              stroke="rgba(238, 205, 120, 0.28)"
              strokeWidth="11"
            />
            <circle
              cx={CX}
              cy={CY}
              r="96.5"
              fill="none"
              stroke="rgba(255, 255, 255, 0.55)"
              strokeWidth="1.2"
            />
            <circle
              cx={CX}
              cy={CY}
              r="85.5"
              fill="none"
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth="1"
            />

            {/* The rose card — everything in this group swings with the heading. */}
            <g ref={card}>
              {TICKS.map((deg) => {
                const major = deg % 45 === 0
                const [x1, y1] = xy(major ? 76 : 79, deg)
                const [x2, y2] = xy(83, deg)
                return (
                  <line
                    key={deg}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(255, 255, 255, 0.7)"
                    strokeWidth={major ? 2 : 1}
                    opacity={major ? 0.9 : 0.5}
                  />
                )
              })}
              <circle
                cx={CX}
                cy={CY}
                r="72"
                fill="none"
                stroke="rgba(255, 255, 255, 0.25)"
                strokeWidth="0.8"
              />

              {INTERCARDINALS.map(({ deg, dark, light }) => (
                <g key={deg} stroke="rgba(255, 255, 255, 0.35)" strokeWidth="0.5">
                  <polygon points={dark} fill="rgba(16, 28, 44, 0.5)" />
                  <polygon points={light} fill="rgba(255, 255, 255, 0.5)" />
                </g>
              ))}
              {CARDINALS.map(({ deg, dark, light }) => (
                <g key={deg} stroke="rgba(255, 255, 255, 0.35)" strokeWidth="0.5">
                  <polygon
                    points={dark}
                    fill={deg === 0 ? accentColor : 'rgba(16, 28, 44, 0.5)'}
                    fillOpacity={deg === 0 ? 0.85 : 1}
                  />
                  <polygon
                    points={light}
                    fill={deg === 0 ? accentColor : 'rgba(255, 255, 255, 0.5)'}
                    fillOpacity={deg === 0 ? 0.5 : 1}
                  />
                </g>
              ))}

              {LETTER_ANGLES.map((deg, i) => {
                const [x, y] = xy(66, deg)
                return (
                  <text
                    key={LETTER_CHARS[i]}
                    x={x}
                    y={y}
                    fill={deg === 0 ? accentColor : 'rgba(255, 255, 255, 0.92)'}
                    stroke="rgba(8, 14, 24, 0.45)"
                    strokeWidth="2.2"
                    paintOrder="stroke"
                    fontSize="15"
                    fontFamily="'RunekCompass', Georgia, serif"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {LETTER_CHARS[i]}
                  </text>
                )
              })}
            </g>

            {/* Fixed pivot pin and the lubber line marking your heading. */}
            <circle
              cx={CX}
              cy={CY}
              r="4.5"
              fill="rgba(255, 255, 255, 0.65)"
              stroke="rgba(16, 28, 44, 0.5)"
              strokeWidth="1"
            />
            <circle cx={CX} cy={CY} r="1.5" fill="rgba(16, 28, 44, 0.7)" />
            <polygon
              points="93,2.5 107,2.5 100,20"
              fill="rgba(238, 205, 120, 0.75)"
              stroke="rgba(255, 255, 255, 0.6)"
              strokeWidth="1"
            />
          </svg>

          {readout && (
            <span
              ref={readoutEl}
              style={{
                padding: '2px 9px',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                borderRadius: 999,
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: 'rgba(255, 255, 255, 0.92)',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
                font: "600 0.62rem 'RunekCompass', ui-monospace, monospace",
                letterSpacing: '0.06em',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
              }}
            >
              N 000°
            </span>
          )}
        </div>
      </Html>
    </group>
  )
}
