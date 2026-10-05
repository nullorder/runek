import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { Floor, Terrain } from '@runek/components'
import { type JsonValue, World } from '@runek/core'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { type Group, type Object3D, type PerspectiveCamera, Scene } from 'three'
import { PREVIEW } from '../../lib/preview'
import { ThumbnailBaker } from '../outliner/Thumbs'
import { CameraRig } from '../scene/CameraRig'
import { GlProbe, StatsProbe } from '../scene/Probes'
import { nodeObjects } from '../scene/refs'
import { hasSeed } from '../schema'
import { StageView } from '../stage/Stage'
import { type LabLight, requestCamera, setLab, useWorkshop } from '../state/store'
import { Bounds, Normals, ScaleReference, Wireframe } from './Instruments'
import { hashGeometry, measure, signature, useLabMeasure } from './measure'
import { Subject } from './Subject'

export const LIGHT_TIMES: Record<LabLight, string> = {
  studio: '13:00',
  morning: '07:40',
  noon: '12:30',
  dusk: '18:50',
  night: '22:30',
}

const BACKDROPS: Record<string, string | null> = {
  grey: '#3a3f47',
  checker: null,
  transparent: null,
}
const PEDESTAL = 0.3

/** Calls `onStable` once the subtree's geometry stops changing (time-sliced builds included). */
function useStable(
  target: React.RefObject<Object3D | null>,
  key: string,
  onStable: (ms: number) => void,
  frames = 8,
) {
  const state = useRef({ start: 0, changed: 0, last: '', count: 0, done: false })
  useEffect(() => {
    const now = performance.now()
    state.current = { start: now, changed: now, last: '', count: 0, done: false }
  }, [key])
  useFrame(() => {
    const s = state.current
    if (s.done || !target.current) return
    const sig = signature(target.current)
    if (sig === s.last && !sig.startsWith('0:')) s.count++
    else {
      s.count = 0
      s.changed = performance.now()
    }
    s.last = sig
    if (s.count >= frames || performance.now() - s.start > 15000) {
      s.done = true
      onStable(s.changed - s.start)
    }
  })
}

function LabSubject() {
  const lab = useWorkshop((s) => s.lab)
  const ref = useRef<Group>(null)
  const props = useMemo(() => ({ ...lab.props }), [lab.props])
  const version = `${lab.type}:${JSON.stringify(props)}`
  const raise = lab.ground === 'pedestal' ? PEDESTAL : 0

  useStable(ref, version, (ms) => {
    if (ref.current)
      useLabMeasure.setState({ stats: { ...measure(ref.current), buildMs: Math.round(ms) } })
  })

  useFrame((_, dt) => {
    if (lab.instruments.turntable && ref.current) ref.current.rotation.y += dt * 0.5
  })

  return (
    <>
      <group
        ref={(g) => {
          ref.current = g
          if (g) nodeObjects.set('lab:subject', g)
        }}
        name="subject"
        position={[0, raise, 0]}
      >
        <Subject key={lab.type} type={lab.type} props={props} />
      </group>
      {lab.instruments.wireframe && <Wireframe target={ref} version={version} />}
      {lab.instruments.normals && <Normals target={ref} version={version} />}
      {lab.instruments.bounds && <Bounds target={ref} />}
      {lab.instruments.scale && <ScaleReference target={ref} />}
    </>
  )
}

function LabGround() {
  const ground = useWorkshop((s) => s.lab.ground)
  if (ground === 'pedestal') {
    return (
      <mesh position={[0, PEDESTAL / 2, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.6, 1.75, PEDESTAL, 64]} />
        <meshStandardMaterial color="#20262e" roughness={0.6} metalness={0.2} />
      </mesh>
    )
  }
  if (ground === 'floor') return <Floor position={[0, 0, 0]} size={[12, 12]} />
  if (ground === 'terrain') return <Terrain size={[24, 24]} relief={1.6} flatRadius={2} seed={5} />
  return null
}

/** Renders N subjects (seed grid, A/B) into scissored viewports of one canvas, one camera. */
function MultiView({
  cells,
  columns,
}: {
  cells: { key: string; props: Record<string, JsonValue> }[]
  columns: number
}) {
  const type = useWorkshop((s) => s.lab.type)
  const backdrop = useWorkshop((s) => s.lab.backdrop)
  const { gl, camera, size } = useThree()
  const scenes = useMemo(() => cells.map(() => new Scene()), [cells])
  const rows = Math.ceil(cells.length / columns)

  useFrame(() => {
    const cam = camera as PerspectiveCamera
    const w = size.width / columns
    const h = size.height / rows
    const aspect = cam.aspect
    cam.aspect = w / h
    cam.updateProjectionMatrix()
    gl.setScissorTest(true)
    scenes.forEach((scene, i) => {
      const x = (i % columns) * w
      const y = size.height - (Math.floor(i / columns) + 1) * h
      gl.setViewport(x + 1, y + 1, w - 2, h - 2)
      gl.setScissor(x + 1, y + 1, w - 2, h - 2)
      gl.setClearColor(
        backdrop === 'transparent' ? '#000000' : i % 2 ? '#1d2229' : '#1a1e25',
        backdrop === 'transparent' ? 0 : 1,
      )
      gl.clear()
      gl.render(scene, cam)
    })
    gl.setScissorTest(false)
    gl.setViewport(0, 0, size.width, size.height)
    cam.aspect = aspect
    cam.updateProjectionMatrix()
  }, 1)

  return (
    <>
      {cells.map((cell, i) => (
        <Fragment key={cell.key}>
          {createPortal(
            <>
              <ambientLight intensity={0.8} />
              <directionalLight position={[6, 10, 6]} intensity={1.6} />
              <directionalLight position={[-5, 4, -6]} intensity={0.4} />
              <group
                ref={(g) => {
                  if (g && i === 0) nodeObjects.set('lab:subject', g)
                }}
              >
                <Subject type={type} props={cell.props} />
              </group>
            </>,
            scenes[i],
            { events: { enabled: false } },
          )}
        </Fragment>
      ))}
    </>
  )
}

function SeedGrid() {
  const lab = useWorkshop((s) => s.lab)
  const cells = useMemo(
    () =>
      Array.from({ length: lab.grid * lab.grid }, (_, i) => ({
        key: `${lab.seedBase + i}`,
        props: { ...lab.props, seed: lab.seedBase + i },
      })),
    [lab.grid, lab.seedBase, lab.props],
  )
  return <MultiView cells={cells} columns={lab.grid} />
}

function Compare() {
  const props = useWorkshop((s) => s.lab.props)
  const propsB = useWorkshop((s) => s.lab.propsB)
  const cells = useMemo(
    () => [
      { key: 'a', props },
      { key: 'b', props: propsB ?? props },
    ],
    [props, propsB],
  )
  return <MultiView cells={cells} columns={2} />
}

/** Builds the subject twice (and once with the next seed) off-screen, then hashes the geometry. */
function DeterminismCheck() {
  const lab = useWorkshop((s) => s.lab)
  const [snapshot] = useState(() => ({ type: lab.type, props: lab.props }))
  const scenes = useMemo(() => [new Scene(), new Scene(), new Scene()], [])
  const roots = useRef<(Group | null)[]>([null, null, null])
  const progress = useRef({ start: performance.now(), last: '', count: 0, done: false })
  const seed = typeof snapshot.props.seed === 'number' ? snapshot.props.seed : 1

  useFrame(() => {
    const p = progress.current
    const [a, again, other] = roots.current
    if (p.done || !a || !again || !other) return
    const sig = [a, again, other].map(signature).join('|')
    p.count = sig === p.last && !sig.startsWith('0:') ? p.count + 1 : 0
    p.last = sig
    if (p.count < 12 && performance.now() - p.start < 20000) return
    p.done = true
    const [ha, hagain, hother] = [a, again, other].map(hashGeometry)
    let diff: string | undefined
    if (ha.hash !== hagain.hash) {
      const i = ha.parts.findIndex((part, j) => part !== hagain.parts[j])
      diff =
        i >= 0
          ? `first difference at mesh #${i} (${ha.parts[i]?.split(':')[0]})`
          : 'different mesh counts'
    }
    useLabMeasure.setState({
      check: {
        status: 'done',
        deterministic: ha.hash === hagain.hash,
        seedSensitive: hasSeed(snapshot.type) ? ha.hash !== hother.hash : null,
        hashes: { a: ha.hash, again: hagain.hash, other: hother.hash },
        diff,
      },
    })
  })

  return (
    <>
      {scenes.map((scene, i) => (
        <Fragment key={i}>
          {createPortal(
            <group
              ref={(g) => {
                roots.current[i] = g
              }}
            >
              <Subject
                type={snapshot.type}
                props={{ ...snapshot.props, seed: i === 2 ? seed + 1 : seed }}
              />
            </group>,
            scene,
            { events: { enabled: false } },
          )}
        </Fragment>
      ))}
    </>
  )
}

function AutoFrame() {
  const type = useWorkshop((s) => s.lab.type)
  const view = useWorkshop((s) => s.lab.view)
  const ground = useWorkshop((s) => s.lab.ground)
  const size = useThree((s) => s.size)
  const pending = useRef(0)
  useEffect(() => {
    const preset = PREVIEW[type]
    const raise = ground === 'pedestal' ? PEDESTAL : 0
    if (preset?.camera && view === 'single') {
      const [x, y, z] = preset.camera
      const [tx, ty, tz] = preset.target ?? [0, 0.9, 0]
      requestCamera({
        kind: 'restore',
        camera: { position: [x, y + raise, z], target: [tx, ty + raise, tz] },
      })
      pending.current = 0
    } else pending.current = 45
  }, [type, view, ground])
  useFrame(() => {
    if (pending.current <= 0) return
    pending.current--
    if (pending.current === 0) {
      const aspect = size.width / size.height / (view === 'compare' ? 2 : 1)
      requestCamera({ kind: 'frame', id: 'lab:subject', aspect })
    }
  })
  return null
}

export default function LabView() {
  const lab = useWorkshop((s) => s.lab)
  const stage = useWorkshop((s) => s.stage)
  const backdrop = lab.backdrop
  const multi = lab.view !== 'single'
  const checking = useLabMeasure((s) => s.check.status === 'running')

  useEffect(() => {
    useLabMeasure.setState({ stats: null })
  }, [lab.type])

  return (
    <div className={`ws-labview ${backdrop === 'checker' ? 'is-checker' : ''}`}>
      <World
        time={LIGHT_TIMES[lab.light]}
        lights={lab.light === 'studio' || backdrop !== 'stage' || stage === 'none'}
        debug={lab.instruments.colliders}
        input={false}
      >
        <GlProbe />
        <ThumbnailBaker />
        {lab.instruments.stats && <StatsProbe />}
        {backdrop === 'stage' && !multi ? (
          <StageView stage={stage} grid={lab.ground === 'grid'} sky />
        ) : (
          backdrop !== 'transparent' &&
          BACKDROPS[backdrop] && (
            <color attach="background" args={[BACKDROPS[backdrop] as string]} />
          )
        )}
        {multi ? (
          lab.view === 'seeds' ? (
            <SeedGrid />
          ) : (
            <Compare />
          )
        ) : (
          <>
            {backdrop !== 'stage' && <ambientLight intensity={0.35} />}
            <LabGround />
            <LabSubject />
          </>
        )}
        {checking && <DeterminismCheck key={lab.checkRun} />}
        <CameraRig scope="subject" initial={{ position: [3.4, 2.9, 4.4], target: [0, 1.1, 0] }} />
        <AutoFrame />
      </World>
      {multi && <MultiOverlay />}
    </div>
  )
}

/** Labels and click targets over the scissored cells. */
function MultiOverlay() {
  const lab = useWorkshop((s) => s.lab)
  if (lab.view === 'compare') {
    return (
      <div className="ws-cells" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {(['a', 'b'] as const).map((side) => (
          <button
            key={side}
            type="button"
            className={`ws-cell ${lab.editing === side ? 'is-on' : ''}`}
            onClick={() => setLab({ editing: side, propsB: lab.propsB ?? { ...lab.props } })}
          >
            <span>{side.toUpperCase()}</span>
            {side === 'b' && !lab.propsB && <small>click to fork A and edit B</small>}
          </button>
        ))}
      </div>
    )
  }
  const n = lab.grid * lab.grid
  return (
    <div className="ws-cells" style={{ gridTemplateColumns: `repeat(${lab.grid}, 1fr)` }}>
      {Array.from({ length: n }, (_, i) => {
        const seed = lab.seedBase + i
        const current = lab.props.seed === seed
        const pinned = lab.pinned.includes(seed)
        return (
          <button
            key={seed}
            type="button"
            className={`ws-cell ${current ? 'is-on' : ''} ${pinned ? 'is-pinned' : ''}`}
            title="Click to adopt this seed, shift-click to pin it"
            onClick={(e) => {
              if (e.shiftKey)
                setLab({
                  pinned: pinned ? lab.pinned.filter((p) => p !== seed) : [...lab.pinned, seed],
                })
              else setLab({ props: { ...lab.props, seed } })
            }}
          >
            <span>seed {seed}</span>
            {pinned && <small>pinned</small>}
          </button>
        )
      })}
    </div>
  )
}
