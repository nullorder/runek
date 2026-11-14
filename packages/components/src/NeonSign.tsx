import { useFrame } from '@react-three/fiber'
import {
  Dynamic,
  lazyModule,
  useLight,
  useMaterial,
  useNodeRenderer,
  useWorld,
  type Vec3,
} from '@runek/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AdditiveBlending,
  BoxGeometry,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  type Material,
  PlaneGeometry,
  RGBAFormat,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three'
import { fontFamily } from './city/fontFace'
import { emissiveColor, mid, useLadder } from './city/glow'
import { hash2 } from './city/hash'
import { FOG_FADE } from './city/haze'

// The node (TSL) material, loaded only under a node renderer.
const neonNodes = lazyModule(() => import('./nodes/neon'))

export interface NeonSignProps {
  /** The middle of the sign [x, y, z] in units. It faces local +Z. */
  position?: Vec3
  /** Rotation [x, y, z] in radians. */
  rotation?: Vec3
  /** Picks which letters are the bad ones, and when everything stutters. */
  seed?: number
  /** The words, on one line. At most 24 characters are drawn. */
  text?: string
  /** Cap height in units. */
  size?: number
  /** Tube color, lit at the world's `tube` luminance level. */
  color?: string
  /** Which of the world's fonts the tubes are bent to. */
  variant?: 'display' | 'body'
  /** A font URL to use instead of a world font. */
  font?: string
  /** How badly it flickers, 0 (a new sign) to 1 (one that should be taken down). */
  flicker?: number
  /** How many letters have a bad tube of their own. */
  faults?: number
  /** Draw the dark board the tubes are mounted on. */
  board?: boolean
  /** Ask the world's light pool for a real light, which flickers with the sign. */
  light?: boolean
  /** Candela of that light with every tube lit. */
  intensity?: number
}

/** The most letters one sign can flicker on their own. */
const MAX_LETTERS = 24
/** Texture height in pixels. The width follows the words. */
const TEX_H = 128
/** A dark tube still shows: glass in front of a wall. */
const DARK = 0.04

/**
 * How bright each tube of a sign is at `seconds` on the world clock, 1 lit and near 0 dark,
 * written into `out`. A pure function of its arguments: every player who shares the clock sees
 * the same letters drop out at the same moment.
 *
 * Every tube hums a little. The bad ones (`faults` of them, picked by `seed`) buzz: they drop
 * out in short bursts and sometimes stay dark for a few seconds. Now and then the whole sign
 * stutters, as a transformer does.
 */
export function neonLevels(
  out: Float32Array,
  letters: number,
  seed: number,
  seconds: number,
  flicker: number,
  faults: number,
): Float32Array {
  const f = Math.min(1, Math.max(0, flicker))
  // The whole sign: a stutter in one 6 s window out of a few, for under a second.
  const window = Math.floor(seconds / 6)
  let all = 1
  if (f > 0 && hash2(seed * 31 + 7, window) < 0.12 + 0.3 * f) {
    const into = seconds - window * 6 - hash2(seed, window) * 5
    if (into > 0 && into < 0.25 + 0.5 * f)
      all = hash2(seed + 3, Math.floor(seconds * 24)) < 0.5 ? 0.15 : 1
  }
  for (let i = 0; i < letters; i++) {
    // Mains hum: a few percent, out of step from tube to tube.
    let level = 1 - 0.05 * f * (0.5 + 0.5 * Math.sin(seconds * 37 + i * 1.7))
    const bad = f > 0 && faults > 0 && hash2(seed * 17 + 1, i) < faults / Math.max(1, letters)
    if (bad) {
      // In 3 s spells: lit, buzzing, or out.
      const spell = Math.floor(seconds / 3)
      const kind = hash2(seed * 13 + i, spell)
      if (kind < 0.2 * f) level = DARK
      else if (kind < 0.2 * f + 0.45)
        level *= hash2(seed + i * 7, Math.floor(seconds * 18)) < 0.35 + 0.25 * f ? DARK : 1
    }
    out[i] = level * all
  }
  return out
}

interface Drawn {
  texture: DataTexture
  /** Width over height of the drawn words, padding included. */
  aspect: number
  /** How much of the texture's height a capital takes. */
  cap: number
  /** Each letter's left and right edge across the texture, 0 to 1. */
  edges: Float32Array
  letters: number
}

/**
 * The words as bent tubes: R is the tube, G the soft light round it. Drawn in code from a font
 * family the page already has, so no image ships.
 */
function draw(text: string, family: string, weight: number): Drawn | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  // One context for measuring and drawing: the canvas hands back the first one it made.
  const probe = canvas.getContext('2d', { willReadFrequently: true })
  if (!probe) return null
  const word = text.slice(0, MAX_LETTERS)
  // Size the face so a capital takes 46% of the height, whatever the font.
  probe.font = `${weight} 100px ${family}`
  const capAt100 = probe.measureText('H').actualBoundingBoxAscent || 70
  const px = (100 * TEX_H * 0.46) / capAt100
  const font = `${weight} ${px}px ${family}`
  probe.font = font
  const pad = TEX_H * 0.3
  const spacing = px * 0.08
  const advances = [...word].map((ch) => probe.measureText(ch).width + spacing)
  const wide = advances.reduce((a, b) => a + b, 0)
  canvas.width = Math.min(4096, Math.ceil(wide + pad * 2))
  canvas.height = TEX_H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  const W = canvas.width
  const baseline = TEX_H * 0.73
  const pass = (blur: number, line: number) => {
    ctx.clearRect(0, 0, W, TEX_H)
    ctx.font = font
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.lineJoin = ctx.lineCap = 'round'
    ctx.strokeStyle = 'white'
    ctx.lineWidth = line
    ctx.shadowColor = 'white'
    ctx.shadowBlur = blur
    let x = pad
    for (let i = 0; i < advances.length; i++) {
      ctx.strokeText(word[i], x, baseline)
      x += advances[i]
    }
    return ctx.getImageData(0, 0, W, TEX_H).data
  }
  const tube = pass(0, TEX_H * 0.045)
  const data = new Uint8Array(W * TEX_H * 4)
  for (let p = 0; p < W * TEX_H; p++) data[p * 4] = tube[p * 4 + 3]
  const halo = pass(TEX_H * 0.16, TEX_H * 0.07)
  for (let p = 0; p < W * TEX_H; p++) {
    data[p * 4 + 1] = halo[p * 4 + 3]
    data[p * 4 + 3] = 255
  }
  const map = new DataTexture(data, W, TEX_H, RGBAFormat)
  map.flipY = true
  map.magFilter = LinearFilter
  map.minFilter = LinearMipmapLinearFilter
  map.generateMipmaps = true
  map.needsUpdate = true
  const edges = new Float32Array(MAX_LETTERS * 2)
  let x = pad
  for (let i = 0; i < advances.length; i++) {
    edges[i * 2] = (x - spacing / 2) / W
    x += advances[i]
    edges[i * 2 + 1] = (x - spacing / 2) / W
  }
  return { texture: map, aspect: W / TEX_H, cap: 0.46, edges, letters: advances.length }
}

const VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vUv = uv;
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`

// Each fragment finds the letter it is in and takes that tube's level. The halo is light in the
// air, so it is added, and fades with the fog as the lamp cones do.
const FRAG = /* glsl */ `
uniform sampler2D tMap;
uniform vec3 uCore;
uniform vec3 uHalo;
uniform float uLevels[${MAX_LETTERS}];
uniform float uEdges[${MAX_LETTERS * 2}];
varying vec2 vUv;
varying vec3 vWorld;
${FOG_FADE}
void main() {
  vec2 tx = texture2D(tMap, vUv).rg;
  float level = 1.0;
  for (int i = 0; i < ${MAX_LETTERS}; i++) {
    if (vUv.x >= uEdges[2 * i] && vUv.x < uEdges[2 * i + 1]) level = uLevels[i];
  }
  vec3 light = uCore * tx.r * level + uHalo * tx.g * tx.g * level;
  gl_FragColor = vec4(light * hazeFog(vWorld), 1.0);
}`

/**
 * A neon sign: words bent out of glass tube on a dark board, lit at the world's `tube` luminance
 * level, that flicker. Some letters have a bad tube and buzz or drop out, and now and then the
 * whole sign stutters. What is lit when is a pure function of the world clock and `seed`
 * (`neonLevels`), so every player sees the same sign. `BladeSign` and `Sign` are the still ones.
 *
 * The tubes are drawn in code, at mount, from the world's declared fonts (contract §4): no image
 * and no font ships with the component. One draw, never batched, since its light changes every
 * frame. No collider. Under `WebGPURenderer` the whole sign flickers as one, since the node
 * material has no per-letter levels.
 */
export function NeonSign({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  text = 'OPEN',
  size = 0.5,
  color = '#ff6418',
  variant = 'display',
  font,
  flicker = 0.4,
  faults = 1,
  board = true,
  light = false,
  intensity = 60,
}: NeonSignProps) {
  const { unit, fonts, palette, now = Date.now } = useWorld()
  const ladder = useLadder()
  const nodes = useNodeRenderer() ? neonNodes() : null
  const url = font ?? fonts[variant]
  const fallback = variant === 'body' ? 'monospace' : 'sans-serif'
  const weight = variant === 'body' ? 500 : 600
  // Draw at once in a system face, then again when the world's own font has loaded.
  const [face, setFace] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    if (url) void fontFamily(url).then((name) => live && setFace(name))
    return () => {
      live = false
    }
  }, [url])
  const drawn = useMemo(
    () => draw(text, face ? `${face}, ${fallback}` : fallback, weight),
    [text, face, fallback, weight],
  )

  const core = useMemo(() => emissiveColor(color, mid(ladder.tubeCore)), [color, ladder.tubeCore])
  const halo = useMemo(() => emissiveColor(color, ladder.signFace[0]), [color, ladder.signFace])
  const levels = useMemo(() => new Float32Array(MAX_LETTERS).fill(1), [])
  const setWhole = useRef<((level: number) => void) | null>(null)
  const material = useMemo<Material | null>(() => {
    if (!drawn) return null
    let m: Material
    setWhole.current = null
    if (nodes) {
      const made = nodes.neonNodeMaterial(drawn.texture, core, halo)
      setWhole.current = made.setLevel
      m = made.material
    } else {
      m = new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: UniformsUtils.merge([
          UniformsLib.fog,
          {
            tMap: { value: null },
            uCore: { value: core.clone() },
            uHalo: { value: halo.clone() },
            uLevels: { value: null },
            uEdges: { value: null },
          },
        ]),
        fog: true,
      })
      const u = (m as ShaderMaterial).uniforms
      u.tMap.value = drawn.texture
      // Flat arrays, set after the merge so the material reads the live ones.
      u.uLevels.value = levels
      u.uEdges.value = drawn.edges
    }
    m.transparent = true
    m.depthWrite = false
    m.blending = AdditiveBlending
    m.toneMapped = false
    return m
  }, [drawn, nodes, core, halo, levels])
  useEffect(
    () => () => {
      material?.dispose()
      drawn?.texture.dispose()
    },
    [material, drawn],
  )

  const backing = useMaterial({ color: palette.metal, roughness: 0.8 })
  const emitter = useLight({ color, intensity, distance: 14 * unit, decay: 2 }, light)

  useFrame(() => {
    if (!drawn) return
    neonLevels(levels, drawn.letters, seed, now() / 1000, flicker, faults)
    let sum = 0
    for (let i = 0; i < drawn.letters; i++) sum += levels[i]
    const mean = drawn.letters ? sum / drawn.letters : 1
    setWhole.current?.(mean)
    emitter.intensity = intensity * mean
  })

  if (!drawn || !material) return null
  // The texture's height is the cap height over `cap`, and the plane keeps the texture's shape.
  const h = (size / drawn.cap) * unit
  const w = h * drawn.aspect
  return (
    <Dynamic>
      <group position={position} rotation={rotation}>
        {board && (
          <mesh
            position={[0, 0, -0.035 * unit]}
            material={backing}
            geometry={boardGeometry(w * 0.94, h * 0.78, 0.05 * unit)}
          />
        )}
        <mesh
          material={material}
          geometry={planeGeometry(w, h)}
          position={[0, 0, 0.02 * unit]}
          renderOrder={2}
        />
        <object3D ref={emitter.ref} position={[0, 0, 0.6 * unit]} />
      </group>
    </Dynamic>
  )
}

const planes = new Map<string, PlaneGeometry>()
function planeGeometry(w: number, h: number) {
  const key = `${w.toFixed(3)}:${h.toFixed(3)}`
  let g = planes.get(key)
  if (!g) {
    g = new PlaneGeometry(w, h)
    planes.set(key, g)
  }
  return g
}
const boards = new Map<string, BoxGeometry>()
function boardGeometry(w: number, h: number, d: number) {
  const key = `${w.toFixed(3)}:${h.toFixed(3)}:${d.toFixed(3)}`
  let g = boards.get(key)
  if (!g) {
    g = new BoxGeometry(w, h, d)
    boards.set(key, g)
  }
  return g
}
