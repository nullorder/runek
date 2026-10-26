import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import {
  pick,
  range,
  rng,
  sub,
  useMaterials,
  useWorld,
  type Vec3,
  type WorldComponentProps,
} from '@runek/core'
import { useMemo, useState } from 'react'
import { Color, ShaderMaterial, type Texture } from 'three'
import { Sign } from './Sign'

/** Flat on a `wall`, on two floor `stand` posts, on a `desk` foot, or in a wooden picture `frame`
 *  (a digital picture frame, on a wall). */
export type ScreenMount = 'wall' | 'stand' | 'desk' | 'frame'
/** What the screen shows when no `texture` is given. */
export type ScreenContent = 'picture' | 'windows' | 'banner' | 'static' | 'color'

export interface ScreenProps extends WorldComponentProps {
  /** The lit area, [width, height] in units: a phone, a TV, a billboard. */
  size?: [number, number]
  /** Where it hangs or stands; `wall` by default. */
  mount?: ScreenMount
  /** A seeded `picture` (sky, sun, hills) or desktop `windows`, a `banner` of `text`, animated
   *  `static`, or a plain `color`. Seeded between picture and windows when unset. */
  content?: ScreenContent
  /** The banner's words. */
  text?: string
  /** Background glow, and the tint of the picture and windows. Seeded when unset. */
  color?: string
  /** Banner text color. */
  textColor?: string
  /** Lit; off, dark glass. */
  on?: boolean
  /** Bezel and stand; defaults to the palette's `metal` (`wood` for a frame). */
  frameColor?: string
  /** JSX only: a texture the app owns (a `VideoTexture`, a `CanvasTexture`, a render target's
   *  texture) drawn in place of `content`. The screen loads nothing itself. */
  texture?: Texture
}

interface Shape {
  pos: Vec3
  size: [number, number]
  color: string
  round?: boolean
}

const TINTS = ['#6fa3d8', '#e3a46a', '#8fc6a8', '#b49be0', '#e07f7f', '#7fb8c9']
const OFF = '#101214'

const NOISE_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
const NOISE_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec2 uCells;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 cell = floor(vUv * uCells);
  float n = hash(cell + floor(uTime * 24.0) * vec2(1.7, 9.2));
  float band = 0.85 + 0.15 * sin(vUv.y * 40.0 + uTime * 6.0);
  gl_FragColor = vec4(vec3(n * band), 1.0);
}`

/** Flat shapes for a picture or a desktop, in screen-local meters, kept inside the screen. */
function compose(kind: 'picture' | 'windows', seed: number, tint: string, W: number, H: number) {
  const r = rng(sub(seed, 1))
  const base = new Color(tint)
  const shade = (k: number, hue = 0) =>
    base.clone().offsetHSL(hue, 0, 0).multiplyScalar(k).getStyle()
  const out: Shape[] = []
  if (kind === 'picture') {
    const horizon = range(r, -0.15, 0.1) * H
    out.push({ pos: [0, (H / 2 + horizon) / 2, 0], size: [W, H / 2 - horizon], color: shade(1.15) })
    out.push({
      pos: [0, (horizon - H / 2) / 2, 0],
      size: [W, H / 2 + horizon],
      color: shade(0.35, 0.25),
    })
    const m = Math.min(W, H)
    const sunR = 0.12 * m
    out.push({
      pos: [
        range(r, -0.3, 0.3) * W,
        Math.min(H / 2 - sunR, horizon + range(r, 0.12, 0.28) * H),
        0.0006,
      ],
      size: [sunR, sunR],
      color: '#fff3c4',
      round: true,
    })
    for (let i = 0; i < 4; i++) {
      const rad = Math.min(range(r, 0.2, 0.38) * m, H / 2)
      const x = range(r, -0.5, 0.5) * W
      out.push({
        pos: [
          Math.max(-W / 2 + rad, Math.min(W / 2 - rad, x)),
          Math.max(-H / 2 + rad, horizon - rad * range(r, 0.8, 0.95)),
          0.001 + i * 0.0002,
        ],
        size: [rad, rad],
        color: shade(i < 2 ? 0.55 : 0.4, 0.25),
        round: true,
      })
    }
    return out
  }
  out.push({ pos: [0, 0, 0], size: [W, H], color: tint })
  const count = 1 + Math.floor(r() * 3)
  for (let i = 0; i < count; i++) {
    const w = range(r, 0.35, 0.7) * W
    const h = range(r, 0.4, 0.75) * H
    const x = range(r, -W / 2 + w / 2 + 0.02 * W, W / 2 - w / 2 - 0.02 * W)
    const y = range(r, -H / 2 + h / 2 + 0.04 * H, H / 2 - h / 2 - 0.04 * H)
    const z = 0.0006 * (i + 1)
    out.push({ pos: [x, y, z], size: [w, h], color: shade(1.35) })
    out.push({ pos: [x, y + h / 2 - 0.05 * h, z + 0.0002], size: [w, 0.1 * h], color: shade(0.75) })
    const lines = 2 + Math.floor(r() * 4)
    for (let l = 0; l < lines; l++) {
      const lw = range(r, 0.3, 0.85) * w * 0.85
      out.push({
        pos: [x - w * 0.42 + lw / 2, y + h * 0.28 - l * h * 0.14, z + 0.0002],
        size: [lw, 0.045 * h],
        color: shade(0.6),
      })
    }
  }
  return out
}

/**
 * A display of any size: a phone, a computer screen, a TV, a digital picture frame, or a large
 * digital banner. It shows a seeded picture or desktop, a banner of text, animated static, or a
 * plain color, all geometry, and an app can hand it a live `texture` (video, canvas, a render of
 * another camera) to show instead; the screen itself never loads anything. On a `wall` or in a
 * `frame` its origin is the middle of the screen with its back to the wall (local -Z); on a
 * `stand` or a `desk` it is the foot. One cuboid collider.
 */
export function Screen({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  size = [1.6, 0.9],
  mount = 'wall',
  content,
  text = 'Runek',
  color,
  textColor = '#ffffff',
  on = true,
  frameColor,
  texture,
}: ScreenProps) {
  const { unit, palette } = useWorld()
  const W = size[0] * unit
  const H = size[1] * unit
  const framed = mount === 'frame'
  const frame = frameColor ?? (framed ? palette.wood : palette.metal)
  const m = Math.min(W, H)
  const bezel = framed ? Math.max(0.03 * unit, m * 0.08) : Math.max(0.006 * unit, m * 0.015)
  const thick = framed ? 0.03 * unit : Math.max(0.012 * unit, m * 0.03)

  const look = useMemo(() => {
    const r = rng(sub(seed, 0))
    const kind = content ?? pick<ScreenContent>(r, ['picture', 'windows'])
    const tint = color ?? pick(r, TINTS)
    const shapes = kind === 'picture' || kind === 'windows' ? compose(kind, seed, tint, W, H) : []
    return { kind, tint, shapes }
  }, [seed, content, color, W, H])

  const mat = useMaterials({
    bezel: { color: frame, roughness: framed ? 0.6 : 0.4, metalness: framed ? 0 : 0.3 },
    mat: { color: '#f2efe8', roughness: 0.9 },
    off: { color: OFF, roughness: 0.12, metalness: 0.4 },
    tint: { kind: 'basic', color: look.tint, toneMapped: false },
    stand: { color: frame, roughness: 0.5, metalness: 0.3 },
  })
  const shapeMaterials = useMaterials(
    look.shapes.map((s) => ({ kind: 'basic' as const, color: s.color, toneMapped: false })),
  )

  const noise = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: NOISE_VERTEX,
        fragmentShader: NOISE_FRAGMENT,
        uniforms: { uTime: { value: 0 }, uCells: { value: [160, 160 * (H / W)] } },
        toneMapped: false,
      }),
    [W, H],
  )
  useFrame(({ clock }) => {
    if (look.kind === 'static' && on && !texture) noise.uniforms.uTime.value = clock.elapsedTime
  })

  // the banner is one line, laid out at full height and then shrunk to fit the width
  const [fit, setFit] = useState(1)
  const standing = mount === 'stand' || mount === 'desk'
  const lift = mount === 'stand' ? 0.8 * unit : 0.1 * unit + H * 0.1
  const cy = standing ? lift + bezel + H / 2 : 0
  const cz = standing ? 0 : thick / 2 + 0.005 * unit
  const top = cy + H / 2 + bezel
  const glass = 0.0005 * unit + thick / 2

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      {standing ? (
        <CuboidCollider
          args={[W / 2 + bezel, top / 2, Math.max(thick, 0.08 * unit)]}
          position={[0, top / 2, 0]}
        />
      ) : (
        <CuboidCollider args={[W / 2 + bezel, H / 2 + bezel, thick / 2]} position={[0, 0, cz]} />
      )}

      <mesh material={mat.bezel} position={[0, cy, cz]} castShadow>
        <boxGeometry args={[W + bezel * 2, H + bezel * 2, thick]} />
      </mesh>
      {framed && (
        <mesh material={mat.mat} position={[0, cy, cz + thick / 2 + 0.0003 * unit]}>
          <planeGeometry args={[W + bezel * 0.6, H + bezel * 0.6]} />
        </mesh>
      )}

      <group position={[0, cy, cz + glass + (framed ? 0.0005 * unit : 0)]}>
        {!on ? (
          <mesh material={mat.off}>
            <planeGeometry args={[W, H]} />
          </mesh>
        ) : texture ? (
          <mesh>
            <planeGeometry args={[W, H]} />
            <meshBasicMaterial map={texture} toneMapped={false} />
          </mesh>
        ) : look.kind === 'static' ? (
          <mesh material={noise}>
            <planeGeometry args={[W, H]} />
          </mesh>
        ) : look.kind === 'color' || look.kind === 'banner' ? (
          <>
            <mesh material={mat.tint}>
              <planeGeometry args={[W, H]} />
            </mesh>
            {look.kind === 'banner' && text && (
              <group position={[0, 0, 0.001 * unit]} scale={fit}>
                <Sign
                  size={(H * 0.42) / unit}
                  color={textColor}
                  onBounds={(w, h) => w > 0 && setFit(Math.min(1, (W * 0.9) / w, (H * 0.8) / h))}
                >
                  {text}
                </Sign>
              </group>
            )}
          </>
        ) : (
          look.shapes.map((s, i) => (
            <mesh
              key={`${s.pos[0].toFixed(4)}:${s.pos[1].toFixed(4)}:${s.pos[2]}`}
              material={shapeMaterials[i]}
              position={[s.pos[0], s.pos[1], s.pos[2] * unit]}
            >
              {s.round ? (
                <circleGeometry args={[s.size[0], 28]} />
              ) : (
                <planeGeometry args={s.size} />
              )}
            </mesh>
          ))
        )}
      </group>

      {mount === 'stand' &&
        [-1, 1].map((s) => (
          <group key={s} position={[s * W * 0.35, 0, 0]}>
            <mesh material={mat.stand} position={[0, (cy - H / 2) / 2, -thick]} castShadow>
              <boxGeometry args={[0.06 * unit, cy - H / 2, 0.06 * unit]} />
            </mesh>
            <mesh
              material={mat.stand}
              position={[0, 0.015 * unit, -thick]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[0.12 * unit, 0.03 * unit, 0.4 * unit]} />
            </mesh>
          </group>
        ))}
      {mount === 'desk' && (
        <>
          <mesh material={mat.stand} position={[0, (lift + H * 0.3) / 2, -thick]} castShadow>
            <boxGeometry args={[0.05 * unit, lift + H * 0.3, 0.025 * unit]} />
          </mesh>
          <mesh material={mat.stand} position={[0, 0.006 * unit, -thick]} castShadow receiveShadow>
            <cylinderGeometry args={[0.11 * unit, 0.12 * unit, 0.012 * unit, 24]} />
          </mesh>
        </>
      )}
    </RigidBody>
  )
}
