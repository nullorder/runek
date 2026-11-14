import { useFrame } from '@react-three/fiber'
import { useMaterial, useWorld, type Vec3 } from '@runek/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  type Group,
  LinearFilter,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three'
import { fontFamily } from './city/fontFace'
import { useLadder } from './city/glow'
import { hash2 } from './city/hash'

/** The moving mark an ad draws beside its words, or `none` to set the words in the middle. */
export type BillboardMark = 'bowl' | 'battery' | 'watch' | 'plus' | 'dial' | 'clock' | 'none'

/** One ad: big lettering, a smaller line, a mark that moves with the clock, and its colors. */
export interface BillboardAd {
  /** One or two lines of big lettering. */
  lines: string[]
  /** A smaller line under them. */
  tagline?: string
  /** The mark beside the words. */
  mark?: BillboardMark
  /** The board's background. */
  background?: string
  /** The first line and the mark. */
  color?: string
  /** The second line, the tagline and the mark's highlights. */
  accent?: string
}

export interface BillboardProps {
  /** The middle of the lit face [x, y, z] in units. It faces local +Z. */
  position?: Vec3
  /** Rotation [x, y, z] in radians. */
  rotation?: Vec3
  /** Shifts which ad is up when, so two boards side by side do not change together. */
  seed?: number
  /** The lit face, [width, height] in units. */
  size?: [number, number]
  /** The ads it runs, in order, round and round. Sample ads when unset. */
  ads?: BillboardAd[]
  /** Seconds each ad stays up. */
  hold?: number
  /** `wall` hangs it on a wall behind it. `posts` stands it on two legs, `stand` units tall. */
  mount?: 'wall' | 'posts'
  /** Height of the legs under a board on posts, in units. */
  stand?: number
  /** Frame and leg color. Defaults to the world palette's `metal`. */
  frameColor?: string
}

/** The ads a board runs when given none: made-up shops, one of each mark. */
export const SAMPLE_ADS: BillboardAd[] = [
  {
    lines: ['NIGHT', 'NOODLE'],
    tagline: 'ONE BOWL ALL NIGHT',
    mark: 'bowl',
    background: '#2a120c',
    color: '#ffa64d',
    accent: '#ff6418',
  },
  {
    lines: ['CELL', 'CHARGE'],
    tagline: 'POWER WHEN YOU NEED IT',
    mark: 'battery',
    background: '#1d1f22',
    color: '#ece6da',
    accent: '#ff8a1f',
  },
  {
    lines: ['TIME', 'KEEPER'],
    tagline: 'WATCHES MENDED',
    mark: 'watch',
    background: '#16141c',
    color: '#e9e3f5',
    accent: '#7a3cff',
  },
  {
    lines: ['CLEAR+'],
    tagline: 'SEE BETTER TONIGHT',
    mark: 'plus',
    background: '#16141c',
    color: '#b8c4ff',
    accent: '#e9e3f5',
  },
  {
    lines: ['CHROME', 'WORKS'],
    mark: 'dial',
    background: '#1b1a1f',
    color: '#e8e0d4',
    accent: '#c47a4e',
  },
  {
    lines: ['CITY', 'TRANSIT'],
    tagline: 'EVERY TEN MINUTES',
    mark: 'clock',
    background: '#f4f6fb',
    color: '#3d5bff',
    accent: '#3d5bff',
  },
  {
    lines: ['MIND THE GAP'],
    tagline: 'PLEASE STAND CLEAR',
    mark: 'none',
    background: '#3d5bff',
    color: '#f4f6fb',
    accent: '#f4f6fb',
  },
]

/** The picture is drawn at this size and at most this often. */
const W = 512
const H = 288
const REDRAWS_A_SECOND = 10
/** Past this many units from the camera the picture holds still. */
const REACH = 140

type Mark = (g: CanvasRenderingContext2D, t: number, color: string, accent: string) => void

/** `words` at `px` or smaller, so they fit in `room` pixels. */
function text(
  g: CanvasRenderingContext2D,
  words: string,
  x: number,
  y: number,
  px: number,
  room: number,
  color: string,
  face: string,
  weight = 600,
) {
  g.font = `${weight} ${px}px ${face}`
  const wide = g.measureText(words).width
  if (wide > room) g.font = `${weight} ${(px * room) / wide}px ${face}`
  g.fillStyle = color
  g.fillText(words, x, y)
}

// Each mark is a few strokes that move with the clock, centred at (W * 0.24, H * 0.5). None of
// it is an image.
const MARKS: Record<Exclude<BillboardMark, 'none'>, Mark> = {
  // A bowl in profile, and what rises off it.
  bowl(g, t, color, accent) {
    g.fillStyle = accent
    g.beginPath()
    g.arc(W * 0.24, H * 0.56, H * 0.28, 0, Math.PI)
    g.fill()
    g.strokeStyle = color
    g.lineWidth = 5
    for (let k = 0; k < 3; k++) {
      g.beginPath()
      for (let y = 0; y < H * 0.3; y += 4)
        g.lineTo(W * (0.18 + k * 0.06) + Math.sin(y * 0.08 + t * 3 + k) * 8, H * 0.5 - y)
      g.stroke()
    }
  },
  // A cell with a charge notch, filling.
  battery(g, t, color, accent) {
    const x = W * 0.09
    const y = H * 0.3
    const w = W * 0.3
    const h = H * 0.4
    g.strokeStyle = color
    g.lineWidth = 8
    g.strokeRect(x, y, w, h)
    g.fillStyle = color
    g.fillRect(x + w, y + h * 0.3, W * 0.025, h * 0.4)
    g.fillStyle = accent
    g.fillRect(x + 10, y + 10, (w - 20) * ((t % 6) / 6), h - 20)
  },
  // A watch face with its hour and minute hands, keeping the time.
  watch(g, t, color, accent) {
    g.save()
    g.translate(W * 0.24, H * 0.5)
    g.strokeStyle = accent
    g.lineWidth = 8
    g.beginPath()
    g.arc(0, 0, H * 0.3, 0, Math.PI * 2)
    g.stroke()
    g.strokeStyle = color
    g.lineCap = 'round'
    for (const [rate, long, wide] of [
      [1 / 3600, 0.24, 6],
      [1 / 43200, 0.15, 9],
    ] as const) {
      const a = t * rate * Math.PI * 2 - Math.PI / 2
      g.lineWidth = wide
      g.beginPath()
      g.moveTo(0, 0)
      g.lineTo(Math.cos(a) * H * long, Math.sin(a) * H * long)
      g.stroke()
    }
    g.restore()
  },
  // A rounded square with a plus at its centre, breathing.
  plus(g, t, color) {
    const side = H * 0.42 * (1 + 0.06 * Math.sin(t * 2.4))
    g.strokeStyle = color
    g.lineWidth = 9
    g.beginPath()
    g.roundRect(W * 0.24 - side / 2, H * 0.5 - side / 2, side, side, side * 0.24)
    g.stroke()
    g.beginPath()
    g.moveTo(W * 0.24 - side * 0.22, H * 0.5)
    g.lineTo(W * 0.24 + side * 0.22, H * 0.5)
    g.moveTo(W * 0.24, H * 0.5 - side * 0.22)
    g.lineTo(W * 0.24, H * 0.5 + side * 0.22)
    g.stroke()
  },
  // An engraved ring with a minute track, turning.
  dial(g, t, _color, accent) {
    g.save()
    g.translate(W * 0.24, H * 0.5)
    g.rotate(t * 0.15)
    g.strokeStyle = accent
    g.lineWidth = 5
    g.beginPath()
    g.arc(0, 0, H * 0.3, 0, Math.PI * 2)
    g.stroke()
    g.lineWidth = 2.5
    for (let k = 0; k < 60; k++) {
      const a = (k / 60) * Math.PI * 2
      const inner = H * (k % 5 === 0 ? 0.22 : 0.255)
      g.beginPath()
      g.moveTo(Math.cos(a) * inner, Math.sin(a) * inner)
      g.lineTo(Math.cos(a) * H * 0.28, Math.sin(a) * H * 0.28)
      g.stroke()
    }
    g.restore()
  },
  // A ring with a notch at twelve, and a hand sweeping it once a minute.
  clock(g, t, color) {
    g.strokeStyle = color
    g.lineWidth = 16
    g.beginPath()
    g.arc(W * 0.24, H * 0.5, H * 0.3, -Math.PI / 2 + 0.22, Math.PI * 1.5 - 0.22)
    g.stroke()
    g.lineWidth = 6
    g.beginPath()
    g.moveTo(W * 0.24, H * 0.5)
    const a = ((t % 60) / 60) * Math.PI * 2 - Math.PI / 2
    g.lineTo(W * 0.24 + Math.cos(a) * H * 0.22, H * 0.5 + Math.sin(a) * H * 0.22)
    g.stroke()
  },
}

/** Draw `ad` at `t` seconds on the world clock. */
function drawAd(g: CanvasRenderingContext2D, ad: BillboardAd, t: number, face: string) {
  const color = ad.color ?? '#f4f6fb'
  const accent = ad.accent ?? color
  g.fillStyle = ad.background ?? '#16141c'
  g.fillRect(0, 0, W, H)
  const mark = ad.mark ?? 'none'
  const [first = '', second] = ad.lines
  if (mark === 'none') {
    g.textAlign = 'center'
    text(g, first, W * 0.5, H * (second ? 0.38 : 0.5), H * 0.15, W * 0.9, color, face)
    if (second) text(g, second, W * 0.5, H * 0.58, H * 0.15, W * 0.9, accent, face)
    if (ad.tagline) text(g, ad.tagline, W * 0.5, H * 0.8, H * 0.065, W * 0.9, accent, face, 500)
    g.textAlign = 'left'
    return
  }
  MARKS[mark](g, t, color, accent)
  const x = W * 0.46
  const room = W * 0.5
  if (second) {
    text(g, first, x, H * 0.42, H * 0.21, room, color, face)
    text(g, second, x, H * 0.64, H * 0.21, room, accent, face)
    if (ad.tagline) text(g, ad.tagline, x, H * 0.84, H * 0.075, room, color, face, 500)
  } else {
    text(g, first, x, H * 0.46, H * 0.21, room, color, face)
    if (ad.tagline) text(g, ad.tagline, x, H * 0.66, H * 0.085, room, accent, face, 500)
  }
}

/**
 * A billboard that runs ads, each a line or two of lettering beside a mark drawn in code that
 * moves with the clock (a bowl's steam, a watch's hands, a cell filling), cut one to the next
 * every `hold` seconds. Ads are data, so a world writes its own. Which ad is up, and where its
 * hands and steam are, come from the world clock and `seed`, so every player reads the same
 * board. `Screen` is the still one.
 *
 * The picture is a 512 by 288 canvas redrawn ten times a second, and only while the camera is
 * within 140 units: one texture upload each time, one draw for the face and one for the frame.
 * Its white is lit at the world's `screen` luminance level, as a `Screen`'s is. Lettering is in
 * the world's display font (contract §4). No collider.
 */
export function Billboard({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  size = [7.2, 4.05],
  ads = SAMPLE_ADS,
  hold = 9,
  mount = 'wall',
  stand = 5,
  frameColor,
}: BillboardProps) {
  const { unit, fonts, palette, now = Date.now } = useWorld()
  const ladder = useLadder()
  const [w, h] = [size[0] * unit, size[1] * unit]
  const frame = useMaterial({ color: frameColor ?? palette.metal, roughness: 0.6, metalness: 0.3 })
  const [face, setFace] = useState('sans-serif')
  useEffect(() => {
    let live = true
    if (fonts.display)
      void fontFamily(fonts.display).then((name) => {
        if (live && name) setFace(`${name}, sans-serif`)
      })
    return () => {
      live = false
    }
  }, [fonts.display])

  const screen = useMemo(() => {
    if (typeof document === 'undefined') return null
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const g = canvas.getContext('2d')
    if (!g) return null
    const map = new CanvasTexture(canvas)
    map.colorSpace = SRGBColorSpace
    map.minFilter = map.magFilter = LinearFilter
    map.generateMipmaps = false
    const material = new MeshBasicMaterial({ map, toneMapped: false })
    return { g, map, material }
  }, [])
  useEffect(
    () => () => {
      screen?.map.dispose()
      screen?.material.dispose()
    },
    [screen],
  )
  useEffect(() => {
    screen?.material.color.copy(new Color('#ffffff').multiplyScalar(ladder.shopGlass[1]))
  }, [screen, ladder.shopGlass])

  const list = ads.length ? ads : SAMPLE_ADS
  const drawn = useRef({ at: -1, slot: -1, face: '' })
  const where = useMemo(() => new Vector3(), [])
  const anchor = useRef<Group>(null)
  useFrame(({ camera }) => {
    if (!screen || !anchor.current) return
    const seconds = now() / 1000 + hash2(seed, 1) * hold
    const slot = Math.floor(seconds / hold)
    const d = drawn.current
    const changed = slot !== d.slot || face !== d.face
    if (!changed) {
      if (seconds - d.at < 1 / REDRAWS_A_SECOND) return
      if (anchor.current.getWorldPosition(where).distanceTo(camera.position) > REACH * unit) return
    }
    drawn.current = { at: seconds, slot, face }
    const g = screen.g
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.textAlign = 'left'
    g.textBaseline = 'middle'
    g.lineCap = 'butt'
    drawAd(g, list[((slot % list.length) + list.length) % list.length], seconds, face)
    // The cut: for a quarter of a second the new picture comes in torn into strips.
    const into = seconds - slot * hold
    if (into < 0.25) {
      for (let k = 0; k < 6; k++) {
        const y = Math.floor(hash2(slot, k) * H)
        const tall = 8 + Math.floor(hash2(slot + 5, k) * 28)
        const shift = (hash2(slot + 9, k) - 0.5) * 120 * (1 - into / 0.25)
        g.drawImage(g.canvas, 0, y, W, tall, shift, y, W, tall)
      }
    }
    screen.map.needsUpdate = true
  })

  if (!screen) return null
  const edge = 0.14 * unit
  const deep = 0.22 * unit
  return (
    <group ref={anchor} position={position} rotation={rotation}>
      <mesh
        position={[0, 0, -deep / 2 - 0.01 * unit]}
        material={frame}
        geometry={box(w + edge * 2, h + edge * 2, deep)}
        castShadow
      />
      <mesh material={screen.material} geometry={plane(w, h)} />
      {mount === 'posts' &&
        ([-1, 1] as const).map((side) => (
          <mesh
            key={side}
            position={[side * w * 0.32, -h / 2 - (stand * unit) / 2, -deep / 2]}
            material={frame}
            geometry={box(0.24 * unit, stand * unit, 0.24 * unit)}
            castShadow
          />
        ))}
    </group>
  )
}

const boxes = new Map<string, BoxGeometry>()
function box(w: number, h: number, d: number) {
  const key = `${w.toFixed(3)}:${h.toFixed(3)}:${d.toFixed(3)}`
  let g = boxes.get(key)
  if (!g) {
    g = new BoxGeometry(w, h, d)
    boxes.set(key, g)
  }
  return g
}
const planes = new Map<string, PlaneGeometry>()
function plane(w: number, h: number) {
  const key = `${w.toFixed(3)}:${h.toFixed(3)}`
  let g = planes.get(key)
  if (!g) {
    g = new PlaneGeometry(w, h)
    planes.set(key, g)
  }
  return g
}
