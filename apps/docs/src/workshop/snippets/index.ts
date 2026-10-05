import type { WorldNode } from '@runek/core/data'

export interface Snippet {
  id: string
  title: string
  description: string
  nodes: WorldNode[]
}

const around = (
  count: number,
  radius: number,
  make: (i: number, x: number, z: number, a: number) => WorldNode,
) =>
  Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2
    return make(
      i,
      Math.round(Math.cos(a) * radius * 100) / 100,
      Math.round(Math.sin(a) * radius * 100) / 100,
      a,
    )
  })

/** Node groups dropped at the camera focus (positions are relative to it). */
export const SNIPPETS: Snippet[] = [
  {
    id: 'tree-ring',
    title: 'Ring of trees',
    description: 'Eight seeded trees in a circle.',
    nodes: around(8, 6, (i, x, z) => ({
      type: 'Trees',
      anchor: 'ground',
      props: { position: [x, 0, z], seed: 100 + i },
    })),
  },
  {
    id: 'lamp-path',
    title: 'Lamp-lit path',
    description: 'A meandering path with lamps along it.',
    nodes: [
      { type: 'Path', anchor: 'ground', props: { position: [0, 0.02, 0], length: 14, seed: 3 } },
      ...[-5, 0, 5].flatMap((z, i): WorldNode[] => [
        { type: 'Lamp', anchor: 'ground', props: { position: [1.4, 0, z] } },
        { type: 'Bush', anchor: 'ground', props: { position: [-1.5, 0, z + 1], seed: 20 + i } },
      ]),
    ],
  },
  {
    id: 'furnished-room',
    title: 'Furnished room',
    description: 'A cosy corner: rug, sofa, table, lamp and a shelf.',
    nodes: [
      { type: 'Rug', props: { position: [0, 0.01, 0], size: [3.4, 2.4], seed: 8 } },
      { type: 'Sofa', props: { position: [0, 0, -1.4], seed: 2, arms: 'square' } },
      { type: 'Table', props: { position: [0, 0, 0], height: 0.45, width: 1, depth: 0.6 } },
      { type: 'Lamp', props: { position: [1.8, 0, -1.4] } },
      {
        type: 'Bookshelf',
        props: { position: [-2.2, 0, -1.2], rotation: [0, 0.5, 0], fill: 0.7, seed: 4 },
      },
      { type: 'Plant', props: { position: [2, 0, 1], seed: 6 } },
    ],
  },
  {
    id: 'market-stall',
    title: 'Market stall',
    description: 'A counter under a tent with crates, barrels and a merchant.',
    nodes: [
      {
        type: 'Tent',
        anchor: 'ground',
        props: { position: [0, 0, 0], width: 3.4, depth: 2.6, collider: false, seed: 9 },
      },
      { type: 'Counter', anchor: 'ground', props: { position: [0, 0, 0.6], length: 2.6, seed: 3 } },
      { type: 'Crate', anchor: 'ground', props: { position: [-1.2, 0, -0.6], seed: 2 } },
      { type: 'Crate', anchor: 'ground', props: { position: [-0.4, 0, -0.8], size: 0.6, seed: 5 } },
      { type: 'Barrel', anchor: 'ground', props: { position: [1.2, 0, -0.6] } },
      {
        type: 'Person',
        anchor: 'ground',
        props: { position: [0, 0, -0.2], kind: 'merchant', bubble: 'Fresh seeds!', seed: 17 },
      },
    ],
  },
  {
    id: 'dock-boat',
    title: 'Dock with a boat',
    description: 'A wooden dock reaching out over water, a sailboat moored beside it.',
    nodes: [
      { type: 'Lake', props: { position: [0, -0.3, 8], size: [24, 18] } },
      { type: 'Dock', props: { position: [0, 0, 6], length: 8, seed: 2 } },
      { type: 'Sailboat', props: { position: [3.2, -0.3, 9], rotation: [0, 0.2, 0], seed: 4 } },
    ],
  },
  {
    id: 'crowd',
    title: 'A crowd of five',
    description: 'Five people wandering, each a different seed and kind.',
    nodes: (['villager', 'merchant', 'guard', 'farmer', 'traveler'] as const).map((kind, i) => ({
      type: 'Person',
      anchor: 'ground' as const,
      props: { position: [(i - 2) * 1.6, 0, (i % 2) * 1.2], kind, wander: 3, seed: 200 + i * 13 },
    })),
  },
]
