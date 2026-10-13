import { useFrame, useThree } from '@react-three/fiber'
import { Person, resolvePerson, Sky, Stool } from '@runek/components'
import { DEFAULT_PALETTE, type JsonValue, World } from '@runek/core'
import { useEffect, useMemo, useRef } from 'react'
import { type Group, Object3D } from 'three'
import { MultiView } from '../lab/MultiView'
import { BOTTOM, panelState, TOP, useLayout } from '../panels/layout'
import { CameraRig } from '../scene/CameraRig'
import { GlProbe } from '../scene/Probes'
import type { CameraState } from '../share/codec'
import { AvatarStudio, FACING, HallSide, PLATFORM } from '../stage/AvatarStudio'
import { Doorway } from '../stage/Stage'
import {
  requestCamera,
  type StudioAngle,
  type StudioLight,
  setStudio,
  studioProps,
  useWorkshop,
  writeStudio,
} from '../state/store'
import { TileBaker } from './tiles'
import { LOOK_KEYS, type TabId } from './traits'

const LIGHT_TIMES: Record<StudioLight, string> = {
  studio: '13:00',
  warm: '17:40',
  dusk: '19:10',
  night: '23:00',
}
const HEADS = { stylized: 6.2, realistic: 7.5, anime: 6.8 } as const
const ANGLES: Record<StudioAngle, number> = {
  front: 0,
  three: 0.6,
  side: Math.PI / 2,
  back: Math.PI,
}
/** What the platform shows besides the look: the pose tab's props. */
const SHOWN = [...LOOK_KEYS, 'pose', 'idle', 'lookAt', 'emote', 'bubble', 'label']
const SEATED = new Set(['sit', 'type'])

type Props = Record<string, JsonValue>

const shown = (props: Props) => {
  const out: Props = {}
  for (const key of SHOWN) if (props[key] !== undefined) out[key] = props[key]
  return out
}

/** Where the camera stands for a tab: what to look at and how much of the figure to fit. */
export function framing(
  tab: TabId,
  angle: StudioAngle,
  figure: { height: number; style: keyof typeof HEADS; age: string; seated?: boolean },
  origin: [number, number, number] = [PLATFORM.position[0], PLATFORM.height, PLATFORM.position[2]],
  /** Where the clear part of the screen is centered, as a fraction of its width off center
   *  (negative: left), so the figure lands between the panels. */
  offset = 0,
  aspect = 1.6,
): CameraState {
  const h = figure.height
  const head = h / (HEADS[figure.style] * (figure.age === 'child' ? 0.74 : 1))
  // Seated, the head drops by about a thigh's length.
  const drop = figure.seated ? h * 0.24 : 0
  const headY = h - head * 0.5 - drop
  const [y, span, rise] =
    tab === 'face'
      ? [headY + head * 0.05, head * 2.9, 0.08]
      : tab === 'hair'
        ? [headY + head * 0.15, head * 3.4, 0.25]
        : tab === 'extras'
          ? [headY - head * 0.6, head * 4.8, 0.18]
          : tab === 'pose'
            ? [(h - drop) * 0.6, (h - drop) * 1.6, 0.2]
            : tab === 'clothes'
              ? [(h - drop) * 0.46, (h - drop) * 1.14, 0.22]
              : [(h - drop) * 0.5, (h - drop) * 1.32, 0.2]
  const distance = span / 2 / Math.tan(Math.PI / 6)
  // The figure faces +x (FACING); angle 0 looks it in the face, turning around it from there.
  const a = ANGLES[angle]
  const dir = [Math.cos(a), rise, -Math.sin(a)]
  const len = Math.hypot(dir[0], dir[1], dir[2])
  // Slide camera and target sideways together: the figure moves across the screen, unrotated.
  const slide = -offset * 2 * Math.tan(Math.PI / 6) * aspect * distance
  const side = [dir[2], 0, -dir[0]]
  const sideLen = Math.hypot(side[0], side[2]) || 1
  const center = [origin[0], origin[1] + y, origin[2]]
  const target = center.map((c, i) => c + (side[i] / sideLen) * slide)
  const round = (n: number) => Math.round(n * 1000) / 1000
  return {
    target: target.map(round) as CameraState['target'],
    position: target.map((t, i) => round(t + (dir[i] / len) * distance)) as CameraState['position'],
  }
}

/** The clear part of the screen between the open panels, as `framing`'s offset. */
function clearOffset() {
  const { left, right } = clearArea()
  const width = window.innerWidth
  return ((left + width - right) / 2 - width / 2) / width
}

/** How much of each side of the screen the open panels cover, in pixels. */
function clearArea() {
  const width = window.innerWidth
  if (width < 900) return { left: 0, right: 0, top: TOP, bottom: BOTTOM }
  const { open } = useLayout.getState()
  const left = open.studio?.studio ? panelState('studio') : null
  const right = open.studio?.avatar ? panelState('avatar') : null
  return {
    left: left && !left.collapsed && left.x < width / 2 ? left.x + left.w + 8 : 0,
    right: right && !right.collapsed && right.x > width / 2 ? width - right.x + 8 : 0,
    top: TOP,
    bottom: BOTTOM,
  }
}

const useClearArea = () => {
  useLayout((s) => JSON.stringify([s.open.studio, s.panels.studio, s.panels.avatar]))
  return clearArea()
}

function useFigure() {
  const props = useWorkshop((s) => studioProps(s))
  const palette = useWorkshop((s) => s.world.palette)
  const unit = useWorkshop((s) => s.world.unit)
  const look = useMemo(() => shown(props), [props])
  const resolved = useMemo(
    () => resolvePerson(look as never, { ...DEFAULT_PALETTE, ...palette }, unit ?? 1),
    [look, palette, unit],
  )
  return { look, resolved }
}

function Platform() {
  const { look, resolved } = useFigure()
  const turntable = useWorkshop((s) => s.studio.turntable)
  const spin = useRef<Group>(null)
  useFrame((_, dt) => {
    if (turntable && spin.current) spin.current.rotation.y += dt * 0.45
  })
  useEffect(() => {
    if (!turntable && spin.current) spin.current.rotation.y = 0
  }, [turntable])
  const h = resolved.height.value
  return (
    <group position={[PLATFORM.position[0], PLATFORM.height, PLATFORM.position[2]]}>
      <group ref={spin}>
        <group rotation={[0, FACING, 0]}>
          {SEATED.has(String(look.pose)) && (
            <Stool position={[0, 0, -0.08 * h]} height={0.27 * h} />
          )}
          <Person {...(look as Record<string, never>)} physics={false} detail="high" />
        </group>
      </group>
    </group>
  )
}

function KeyLights() {
  const [px, , pz] = PLATFORM.position
  const target = useMemo(() => {
    const o = new Object3D()
    o.position.set(px, PLATFORM.height + 1, pz)
    return o
  }, [px, pz])
  return (
    <>
      <primitive object={target} />
      <spotLight
        position={[px + 3.2, 3.6, pz + 2.4]}
        target={target}
        angle={0.55}
        penumbra={0.7}
        intensity={42}
        distance={12}
        castShadow
      />
      <spotLight
        position={[px + 2.8, 2.4, pz - 3]}
        target={target}
        angle={0.6}
        penumbra={0.9}
        intensity={14}
        distance={10}
        color="#dfe8ff"
      />
      <spotLight
        position={[px - 2.6, 3.4, pz]}
        target={target}
        angle={0.6}
        penumbra={0.8}
        intensity={26}
        distance={9}
        color="#ffe2c4"
      />
    </>
  )
}

/** Re-frames the camera when the tab, angle, or figure size changes. */
function Framing() {
  const tab = useWorkshop((s) => s.studio.tab)
  const angle = useWorkshop((s) => s.studio.angle)
  const seeds = useWorkshop((s) => s.studio.seeds)
  const { look, resolved } = useFigure()
  const figure = {
    height: resolved.height.value,
    style: resolved.style.value,
    age: resolved.age.value,
    seated: SEATED.has(String(look.pose)),
  }
  const aspect = useThree((s) => s.size.width / s.size.height)
  const panels = useLayout((s) => JSON.stringify([s.open.studio, s.panels.studio, s.panels.avatar]))
  const key = `${panels}:${aspect.toFixed(2)}:${tab}:${angle}:${seeds}:${figure.height.toFixed(2)}:${figure.style}:${figure.age}:${figure.seated}`
  useEffect(() => {
    requestCamera({
      kind: 'restore',
      camera: seeds
        ? framing('body', 'three', figure, [0, 0, 0])
        : framing(tab, angle, figure, undefined, clearOffset(), aspect),
    })
  }, [key])
  return null
}

function Seeds() {
  const props = useWorkshop((s) => studioProps(s))
  const base = useWorkshop((s) => s.studio.seedBase)
  const cells = useMemo(() => {
    const look = shown(props)
    return Array.from({ length: 9 }, (_, i) => ({
      key: `${base + i}`,
      props: { ...look, seed: base + i, lookAt: false, physics: false, rotation: [0, FACING, 0] },
    }))
  }, [props, base])
  const inset = useClearArea()
  return <MultiView type="Person" cells={cells} columns={3} inset={inset} />
}

/** The avatar studio's own canvas: the room (with the hall through its door), the platform
 *  figure under its key lights, or a grid of neighbouring seeds. */
export default function StudioView() {
  const light = useWorkshop((s) => s.studio.light)
  const seeds = useWorkshop((s) => s.studio.seeds)
  const initial = useMemo(() => {
    const s = useWorkshop.getState()
    const look = shown(studioProps(s))
    const r = resolvePerson(look as never)
    return framing(
      s.studio.tab,
      s.studio.angle,
      {
        height: r.height.value,
        style: r.style.value,
        age: r.age.value,
        seated: SEATED.has(String(look.pose)),
      },
      undefined,
      clearOffset(),
      window.innerWidth / window.innerHeight,
    )
  }, [])
  return (
    <div className="ws-labview">
      <World time={LIGHT_TIMES[light]} input={false}>
        <GlProbe />
        <TileBaker />
        {seeds ? (
          <Seeds />
        ) : (
          <>
            <Sky />
            <AvatarStudio full />
            <HallSide />
            <Doorway action="leave" />
            <KeyLights />
            <Platform />
          </>
        )}
        <CameraRig scope="avatar-studio" initial={initial} />
        <Framing />
      </World>
      {seeds && <SeedCells />}
    </div>
  )
}

function SeedCells() {
  const base = useWorkshop((s) => s.studio.seedBase)
  const current = useWorkshop((s) => studioProps(s).seed)
  const { left, right, top, bottom } = useClearArea()
  return (
    <div
      className="ws-cells"
      style={{ gridTemplateColumns: 'repeat(3, 1fr)', left, right, top, bottom }}
    >
      {Array.from({ length: 9 }, (_, i) => {
        const seed = base + i
        return (
          <button
            key={seed}
            type="button"
            className={`ws-cell ${current === seed ? 'is-on' : ''}`}
            title="Wear this seed"
            onClick={() => {
              writeStudio({ ...studioProps(useWorkshop.getState()), seed }, 'studio:seed')
              setStudio({ seeds: false })
            }}
          >
            <span>seed {seed}</span>
          </button>
        )
      })}
    </div>
  )
}
