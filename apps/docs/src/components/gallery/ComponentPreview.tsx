import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { registry } from '@runek/components'
import { DEFAULT_FONTS, DEFAULT_PALETTE, DEFAULT_WORLD_TIME, WorldContext } from '@runek/core'
import { type ComponentType, type ReactNode, useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import { DEFAULT_CAMERA, DEFAULT_TARGET, PREVIEW, SEEDED } from '../../lib/preview'

type Props = { title: string; detail?: boolean }

const components = registry as unknown as Record<string, ComponentType<Record<string, unknown>>>

function Spin({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const ref = useRef<Group>(null)
  useFrame((_, dt) => {
    if (enabled && ref.current) ref.current.rotation.y += dt * 0.35
  })
  return <group ref={ref}>{children}</group>
}

export default function ComponentPreview({ title, detail = false }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  const [seed, setSeed] = useState(3)
  const cfg = PREVIEW[title] ?? {}
  const Component = components[title]

  // Mount the canvas only while on screen so we never exceed the browser's
  // WebGL context limit as the grid scrolls.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: '250px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  if (cfg.skip || !Component) {
    return (
      <div ref={ref} className="preview preview--empty">
        <span>{cfg.note ?? 'No standalone preview.'}</span>
      </div>
    )
  }

  return (
    <div ref={ref} className="preview">
      {inView && (
        <Canvas shadows dpr={[1, 1.5]} camera={{ position: cfg.camera ?? DEFAULT_CAMERA, fov: 50 }}>
          <color attach="background" args={['#0e1117']} />
          <WorldContext.Provider
            value={{
              unit: 1,
              gravity: [0, -9.81, 0],
              ground: 0,
              palette: DEFAULT_PALETTE,
              fonts: DEFAULT_FONTS,
              time: DEFAULT_WORLD_TIME,
            }}
          >
            <ambientLight intensity={0.7} />
            <directionalLight position={[6, 10, 6]} intensity={1.5} castShadow />
            <Physics paused>
              <Spin enabled={!detail}>
                <Component seed={seed} {...cfg.props} />
              </Spin>
            </Physics>
            <OrbitControls
              makeDefault
              target={cfg.target ?? DEFAULT_TARGET}
              enablePan={false}
              enableZoom={detail}
              autoRotate={false}
            />
          </WorldContext.Provider>
        </Canvas>
      )}
      {detail && SEEDED.has(title) && (
        <button
          type="button"
          className="reroll"
          onClick={() => setSeed(1 + Math.floor(Math.random() * 9999))}
          title="Re-roll the seed — same seed always rebuilds the same geometry"
        >
          seed {seed} <span aria-hidden="true">↻</span>
        </button>
      )}
    </div>
  )
}
