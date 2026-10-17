import { pick, range, rng, sub, useWorld, type WorldComponentProps } from '@runek/core'
import { useMemo } from 'react'
import type { Texture } from 'three'
import { Sign } from './Sign'

/** The print: overlapping `shapes`, colored `bands`, a retro `sunset` over the sea, or `peaks`. */
export type PosterArt = 'shapes' | 'bands' | 'sunset' | 'peaks'
/** No frame, a slim one, or a wide one with a mat. */
export type PosterFrame = 'none' | 'thin' | 'wide'

export interface PosterProps extends WorldComponentProps {
  /** The print, [width, height] in units. */
  size?: [number, number]
  /** Seeded when unset. */
  art?: PosterArt
  /** Seeded when unset. */
  frame?: PosterFrame
  /** A caption printed under the art. */
  title?: string
  /** The frame; defaults to the palette's `woodDark`. */
  frameColor?: string
  /** The paper behind the art and the caption. */
  paper?: string
  /** The caption's ink. */
  ink?: string
  /** JSX only: a texture the app owns, printed in place of the seeded art. The poster loads
   *  nothing itself. */
  texture?: Texture
}

type Kind = 'rect' | 'circle' | 'tri'
interface Shape {
  kind: Kind
  x: number
  y: number
  w: number
  h: number
  color: string
}

const ARTS: PosterArt[] = ['shapes', 'bands', 'sunset', 'peaks']
const FRAMES: PosterFrame[] = ['none', 'thin', 'thin', 'wide']
const PALETTES = [
  ['#e4572e', '#f3a712', '#29335c', '#a8c686', '#f0ead6'],
  ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'],
  ['#1d3557', '#457b9d', '#a8dadc', '#f1faee', '#e63946'],
  ['#3d405b', '#81b29a', '#f2cc8f', '#e07a5f', '#f4f1de'],
  ['#2b2d42', '#8d99ae', '#edf2f4', '#ef233c', '#d90429'],
]

/** Shapes in art-local meters (centered, W by H), each inside the art area. */
function paint(art: PosterArt, seed: number, W: number, H: number): Shape[] {
  const r = rng(sub(seed, 1))
  const colors = pick(r, PALETTES)
  const c = (i: number) => colors[i % colors.length]
  const out: Shape[] = []
  const m = Math.min(W, H)
  if (art === 'bands') {
    const n = 4 + Math.floor(r() * 5)
    let y = -H / 2
    const weights = Array.from({ length: n }, () => range(r, 0.5, 1.5))
    const total = weights.reduce((a, b) => a + b, 0)
    weights.forEach((wt, i) => {
      const h = (wt / total) * H
      out.push({ kind: 'rect', x: 0, y: y + h / 2, w: W, h, color: c(i) })
      y += h
    })
    return out
  }
  if (art === 'sunset') {
    const horizon = range(r, -0.2, 0.05) * H
    out.push({
      kind: 'rect',
      x: 0,
      y: (H / 2 + horizon) / 2,
      w: W,
      h: H / 2 - horizon,
      color: c(4),
    })
    const sun = range(r, 0.28, 0.4) * m
    out.push({ kind: 'circle', x: 0, y: horizon, w: sun, h: sun, color: c(0) })
    // the sea covers the sun's lower half; stripes cut across what shows above it
    out.push({
      kind: 'rect',
      x: 0,
      y: (horizon - H / 2) / 2,
      w: W,
      h: H / 2 + horizon,
      color: c(2),
    })
    for (let i = 0; i < 4; i++) {
      out.push({
        kind: 'rect',
        x: 0,
        y: horizon + sun * (0.15 + i * 0.18),
        w: sun * 2.1,
        h: sun * 0.05 * (1 + i * 0.4),
        color: c(4),
      })
    }
    for (let i = 0; i < 3; i++) {
      out.push({
        kind: 'rect',
        x: range(r, -0.1, 0.1) * W,
        y: horizon - (i + 1) * 0.08 * H,
        w: range(r, 0.2, 0.6) * W,
        h: 0.008 * H,
        color: c(1),
      })
    }
    return out
  }
  if (art === 'peaks') {
    out.push({ kind: 'rect', x: 0, y: 0, w: W, h: H, color: c(4) })
    out.push({
      kind: 'circle',
      x: range(r, -0.3, 0.3) * W,
      y: range(r, 0.15, 0.3) * H,
      w: 0.1 * m,
      h: 0.1 * m,
      color: c(1),
    })
    for (let i = 0; i < 4; i++) {
      const w = range(r, 0.45, 0.8) * W
      const h = range(r, 0.35, 0.65) * H * (1 - i * 0.12)
      // a triangle's centroid sits a third of its height above the base
      out.push({
        kind: 'tri',
        x: range(r, -W / 2 + w / 2, W / 2 - w / 2),
        y: -H / 2 + h / 3,
        w,
        h,
        color: c(i % 2 ? 3 : 0),
      })
    }
    return out
  }
  out.push({ kind: 'rect', x: 0, y: 0, w: W, h: H, color: c(4) })
  const n = 4 + Math.floor(r() * 4)
  for (let i = 0; i < n; i++) {
    const kind = pick<Kind>(r, ['rect', 'circle', 'circle', 'tri'])
    const s = range(r, 0.15, 0.4) * m
    const w = kind === 'rect' ? s * range(r, 0.6, 2) : s
    const h = kind === 'rect' ? s * range(r, 0.6, 2) : s
    const hw = kind === 'circle' ? s : Math.min(w, W) / 2
    // how far the shape reaches below and above its origin
    const below = kind === 'circle' ? s : kind === 'tri' ? h / 3 : h / 2
    const above = kind === 'circle' ? s : kind === 'tri' ? (h * 2) / 3 : h / 2
    out.push({
      kind,
      x: range(r, -W / 2 + hw, W / 2 - hw),
      y: range(r, -H / 2 + below, H / 2 - above),
      w: Math.min(w, W),
      h: Math.min(h, H),
      color: c(i % 4),
    })
  }
  return out
}

/**
 * A print for a wall: seeded flat art (overlapping shapes, color bands, a retro sunset, or
 * mountain peaks) on paper, with an optional caption and a slim or wide frame. Its origin is the
 * middle of the print with its back to the wall (local -Z). An app can print its own `texture`
 * instead; the poster loads nothing itself. Decorative: no collider.
 */
export function Poster({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  size = [0.5, 0.7],
  art,
  frame,
  title,
  frameColor,
  paper = '#f4f1ea',
  ink = '#222222',
  texture,
}: PosterProps) {
  const { unit, palette } = useWorld()
  const W = size[0] * unit
  const H = size[1] * unit
  const m = Math.min(W, H)
  const margin = 0.06 * m
  const caption = title ? 0.14 * H : 0
  const artW = W - margin * 2
  const artH = H - margin * 2 - caption

  const look = useMemo(() => {
    const r = rng(sub(seed, 0))
    const rolled = { art: pick(r, ARTS), frame: pick(r, FRAMES) }
    const kind = art ?? rolled.art
    return { art: kind, frame: frame ?? rolled.frame, shapes: paint(kind, seed, artW, artH) }
  }, [seed, art, frame, artW, artH])

  const edge = look.frame === 'wide' ? 0.06 * unit : look.frame === 'thin' ? 0.02 * unit : 0
  const depth = look.frame === 'none' ? 0.002 * unit : 0.025 * unit
  const face = depth + 0.0005 * unit
  const artY = caption / 2
  const wood = frameColor ?? palette.woodDark
  const layer = 0.0003 * unit

  return (
    <group position={position} rotation={rotation}>
      {look.frame !== 'none' && (
        <mesh position={[0, 0, depth / 2]} castShadow>
          <boxGeometry args={[W + edge * 2, H + edge * 2, depth]} />
          <meshStandardMaterial color={wood} roughness={0.6} />
        </mesh>
      )}
      <mesh position={[0, 0, face]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color={paper} roughness={0.9} />
      </mesh>
      <group position={[0, artY, face + layer]}>
        {texture ? (
          <mesh>
            <planeGeometry args={[artW, artH]} />
            <meshStandardMaterial map={texture} roughness={0.8} />
          </mesh>
        ) : (
          look.shapes.map((s, i) => (
            <mesh
              key={i}
              position={[s.x, s.y, i * layer]}
              rotation={s.kind === 'tri' ? [0, 0, Math.PI / 2] : [0, 0, 0]}
              scale={s.kind === 'tri' ? [s.h / 1.5, s.w / Math.sqrt(3), 1] : [1, 1, 1]}
            >
              {s.kind === 'rect' ? (
                <planeGeometry args={[s.w, s.h]} />
              ) : s.kind === 'circle' ? (
                <circleGeometry args={[s.w, 32]} />
              ) : (
                <circleGeometry args={[1, 3]} />
              )}
              <meshStandardMaterial color={s.color} roughness={0.85} />
            </mesh>
          ))
        )}
      </group>
      {title && (
        <Sign
          position={[0, -H / 2 + margin + caption / 2, face + layer]}
          size={(caption * 0.45) / unit}
          maxWidth={artW / unit}
          color={ink}
          variant="body"
        >
          {title}
        </Sign>
      )}
    </group>
  )
}
