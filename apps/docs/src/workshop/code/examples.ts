/** Complete App.tsx examples for the live editor. Each runs as-is in the sandbox and keeps the
 *  world JSON live through `import world from './world.json'`. */
export interface Example {
  id: string
  title: string
  description: string
  code: string
}

export const EXAMPLES: Example[] = [
  {
    id: 'custom-component',
    title: 'A custom procedural component',
    description:
      'Write your own seeded component and place it from world.json as { "type": "Beacon" }.',
    code: `import { registry as stock } from '@runek/components'
import { int, range, rng, useWorld, type Vec3, type WorldData, WorldRenderer } from '@runek/core'
import { useMemo } from 'react'
import world from './world.json'

/** A stack of glowing stones: same seed, same stack. */
function Beacon({ position = [0, 0, 0], seed = 1 }: { position?: Vec3; seed?: number }) {
  const { palette } = useWorld()
  const stones = useMemo(() => {
    const r = rng(seed)
    let y = 0
    return Array.from({ length: int(r, 3, 7) }, () => {
      const size = range(r, 0.25, 0.6)
      y += size
      return { y: y - size / 2, size, turn: range(r, 0, Math.PI) }
    })
  }, [seed])
  return (
    <group position={position}>
      {stones.map((s, i) => (
        <mesh key={i} position={[0, s.y, 0]} rotation={[0, s.turn, 0]} castShadow>
          <boxGeometry args={[s.size, s.size * 0.9, s.size]} />
          <meshStandardMaterial color={palette.stone} emissive={palette.accent} emissiveIntensity={i / 8} />
        </mesh>
      ))}
    </group>
  )
}

// Exported, so the workshop's outliner knows "Beacon" too: add { "type": "Beacon" } in world.json.
export const registry = { ...stock, Beacon }

export default function App() {
  const data = world as WorldData
  const withBeacons = {
    ...data,
    nodes: [...data.nodes, { type: 'Beacon', props: { position: [3, 0, 3], seed: 7 } }],
  }
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <WorldRenderer data={withBeacons as WorldData} registry={registry} />
    </div>
  )
}
`,
  },
  {
    id: 'animation',
    title: 'Animate with useFrame',
    description:
      'Compose <World> yourself to add your own 3D children: a lantern orbiting the world.',
    code: `import { useFrame } from '@react-three/fiber'
import { registry } from '@runek/components'
import { World, type WorldData, WorldNodes } from '@runek/core'
import { useRef } from 'react'
import type { Group } from 'three'
import world from './world.json'

function Orbiter({ radius = 4, height = 2.5, speed = 0.6 }) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed
    ref.current?.position.set(Math.cos(t) * radius, height + Math.sin(t * 2) * 0.3, Math.sin(t) * radius)
  })
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.18, 24, 16]} />
        <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={3} />
      </mesh>
      <pointLight color="#ffcf8a" intensity={6} distance={8} />
    </group>
  )
}

export default function App() {
  const data = world as WorldData
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <World time={data.time} timezone={data.timezone} palette={data.palette} fog={data.fog}>
        <WorldNodes nodes={data.nodes} registry={registry} />
        <Orbiter />
      </World>
    </div>
  )
}
`,
  },
  {
    id: 'interaction',
    title: 'Interactions and handlers',
    description: 'Wrap a sign in Interactable, react to its action, and click books on a shelf.',
    code: `import { Bookshelf, Interactable, Player, registry, Sign } from '@runek/components'
import { type WorldData, World, WorldNodes } from '@runek/core'
import { useState } from 'react'
import world from './world.json'

export default function App() {
  const data = world as WorldData
  const [count, setCount] = useState(0)
  const [book, setBook] = useState('click a book')
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <World time={data.time} palette={data.palette} controls={{ use: ['KeyE'] }}>
        <WorldNodes nodes={data.nodes.filter((n) => n.type !== 'Player')} registry={registry} />
        <Interactable
          position={[0, 0, -4]}
          actions={[{ id: 'press', label: 'Press', control: 'use' }]}
          onAction={() => setCount((c) => c + 1)}
        >
          <Sign position={[0, 1.6, 0]} size={0.4} glow>{\`pressed \${count}×\`}</Sign>
        </Interactable>
        <Bookshelf
          position={[3, 0, -4]}
          books={[
            { id: 'a', title: 'Seeds', shelf: 0 },
            { id: 'b', title: 'Worlds as data', shelf: 1 },
            { id: 'c', title: 'Determinism', shelf: 2 },
          ]}
          onBookSelect={(b) => setBook(b.title ?? b.id)}
        />
        <Sign position={[3, 2.6, -4]} size={0.18}>{book}</Sign>
        <Player position={[0, 2, 2]} />
      </World>
    </div>
  )
}
`,
  },
  {
    id: 'generate',
    title: 'Generate a world in code',
    description: 'Build nodes with a seeded loop: a forest whose size you set in one constant.',
    code: `import { registry } from '@runek/components'
import { range, rng, type WorldData, type WorldNode, WorldRenderer } from '@runek/core'
import world from './world.json'

const TREES = 40
const r = rng(2024)
const forest: WorldNode[] = Array.from({ length: TREES }, (_, i) => {
  const a = range(r, 0, Math.PI * 2)
  const d = range(r, 6, 14)
  return { type: 'Trees', props: { position: [Math.cos(a) * d, 0, Math.sin(a) * d], seed: i } }
})

export default function App() {
  const data = world as WorldData
  console.log(\`\${data.nodes.length} nodes from world.json + \${forest.length} generated\`)
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <WorldRenderer data={{ ...data, nodes: [...data.nodes, ...forest] }} registry={registry} />
    </div>
  )
}
`,
  },
]
