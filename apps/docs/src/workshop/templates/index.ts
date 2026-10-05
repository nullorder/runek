import type { WorldData, WorldNode } from '@runek/core/data'
import type { CameraState, Stage } from '../share/codec'

export interface Template {
  id: string
  title: string
  description: string
  stage: Stage
  /** Where the camera starts when the template loads. */
  camera: CameraState
  world: WorldData
}

const ring = (
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

export const TEMPLATES: Template[] = [
  {
    id: 'empty',
    title: 'Empty plot',
    description: 'Nothing but the workshop floor. Start from scratch.',
    stage: 'room',
    camera: { position: [8.5, 6.5, 10], target: [0, 0.8, 0] },
    world: { version: 1, meta: { title: 'Untitled world' }, nodes: [] },
  },
  {
    id: 'reading-room',
    title: 'Reading room',
    description: 'Shelves, a sofa and a lamp: the library in miniature.',
    stage: 'room',
    camera: { position: [5.5, 4.2, 7], target: [0, 0.8, -0.5] },
    world: {
      version: 1,
      meta: { title: 'Reading room' },
      time: '21:00',
      palette: { wood: '#7a5a40', fabric: '#6e3d44', accent: '#c2a05a' },
      nodes: [
        { type: 'Rug', props: { position: [0, 0.01, 0], size: [5, 3.4], seed: 5 } },
        {
          type: 'Bookshelf',
          props: { position: [-2.4, 0, -3], fill: 0.75, seed: 3, label: 'Fiction' },
        },
        { type: 'Bookshelf', props: { position: [-0.8, 0, -3], fill: 0.6, seed: 7 } },
        {
          type: 'Bookshelf',
          props: { position: [0.8, 0, -3], fill: 0.85, seed: 11, label: 'Poetry' },
        },
        { type: 'Bookshelf', props: { position: [2.4, 0, -3], fill: 0.5, seed: 17 } },
        {
          type: 'Sofa',
          props: { position: [0, 0, 1.6], rotation: [0, Math.PI, 0], seed: 3, arms: 'rolled' },
        },
        { type: 'Table', props: { position: [0, 0, 0], width: 1.1, depth: 0.6, height: 0.45 } },
        { type: 'Book', props: { position: [0.1, 0.46, 0], pose: 'open', seed: 4 } },
        { type: 'Lamp', props: { position: [-2.2, 0, 1.6] } },
        { type: 'Chair', props: { position: [2.2, 0, 0.6], rotation: [0, -1.2, 0] } },
        { type: 'Plant', props: { position: [2.6, 0, 1.8], seed: 9, height: 1 } },
        {
          type: 'Person',
          props: {
            position: [2.2, 0, 0.6],
            rotation: [0, -1.2, 0],
            pose: 'sit',
            kind: 'scholar',
            seed: 21,
          },
        },
      ],
    },
  },
  {
    id: 'village',
    title: 'Village square',
    description: 'A fountain, two houses, a well and a few villagers going about their day.',
    stage: 'plot',
    camera: { position: [15, 11, 19], target: [0, 1, 0] },
    world: {
      version: 1,
      meta: { title: 'Village square' },
      time: '16:30',
      nodes: [
        { type: 'Terrain', props: { size: [60, 60], relief: 1.4, flatRadius: 14, seed: 4 } },
        { type: 'Fountain', anchor: 'ground', props: { position: [0, 0, 0] } },
        {
          type: 'House',
          anchor: 'ground',
          props: { position: [-9, 0, -7], rotation: [0, 0.4, 0], seed: 3 },
        },
        {
          type: 'House',
          anchor: 'ground',
          props: { position: [9, 0, -6], rotation: [0, -0.5, 0], seed: 8 },
        },
        { type: 'Hut', anchor: 'ground', props: { position: [8, 0, 8], seed: 2 } },
        { type: 'Well', anchor: 'ground', props: { position: [-6, 0, 5] } },
        { type: 'Path', anchor: 'ground', props: { position: [0, 0.02, 8], length: 12, seed: 6 } },
        { type: 'Bench', anchor: 'ground', props: { position: [0, 0, -3.4] } },
        { type: 'Lamp', anchor: 'ground', props: { position: [3, 0, 3] } },
        { type: 'Lamp', anchor: 'ground', props: { position: [-3, 0, -3] } },
        {
          type: 'Flowers',
          anchor: 'ground',
          props: { position: [-4, 0, -1], area: [3, 3], count: 40, seed: 5 },
        },
        { type: 'Fence', anchor: 'ground', props: { position: [-9, 0, 3], length: 6, seed: 2 } },
        {
          type: 'Signpost',
          anchor: 'ground',
          props: { position: [2.5, 0, 9], name: 'Runek', seed: 4 },
        },
        ...ring(6, 18, (i, x, z) => ({
          type: 'Trees',
          anchor: 'ground' as const,
          props: { position: [x, 0, z], seed: 10 + i },
        })),
        {
          type: 'Person',
          anchor: 'ground',
          props: { position: [2, 0, 2], kind: 'merchant', wander: 3, seed: 31 },
        },
        {
          type: 'Person',
          anchor: 'ground',
          props: { position: [-2, 0, 3], kind: 'villager', wander: 4, seed: 44 },
        },
        {
          type: 'Person',
          anchor: 'ground',
          props: { position: [0.4, 0, -3.4], pose: 'sit', kind: 'farmer', age: 'elder', seed: 52 },
        },
      ],
    },
  },
  {
    id: 'island',
    title: 'Island cove',
    description: 'Palms, a dock, a sailboat and the open sea at golden hour.',
    stage: 'plot',
    camera: { position: [22, 12, 30], target: [0, 1, 6] },
    world: {
      version: 1,
      meta: { title: 'Island cove' },
      time: '18:40',
      fog: { color: '#e6b98a', near: 60, far: 220 },
      nodes: [
        { type: 'Ocean', props: { position: [0, -0.4, 0] } },
        {
          type: 'Terrain',
          props: {
            size: [44, 44],
            relief: 3,
            falloff: 0.55,
            flatRadius: 7,
            seed: 12,
            color: '#d8c79a',
          },
        },
        ...ring(5, 8, (i, x, z) => ({
          type: 'Palm',
          anchor: 'ground' as const,
          props: { position: [x, 0, z], rotation: [0, i, 0], seed: 3 + i },
        })),
        { type: 'Campfire', anchor: 'ground', props: { position: [0, 0, 0], seed: 2 } },
        { type: 'Rocks', anchor: 'ground', props: { position: [-4, 0, 3], count: 5, seed: 7 } },
        { type: 'Dock', props: { position: [0, 0, 19], length: 9, seed: 3 } },
        { type: 'Sailboat', props: { position: [4, -0.2, 24], rotation: [0, 0.6, 0], seed: 5 } },
        {
          type: 'Person',
          anchor: 'ground',
          props: {
            position: [1.4, 0, 0.6],
            pose: 'sit',
            kind: 'sailor',
            rotation: [0, -2.4, 0],
            seed: 61,
          },
        },
        { type: 'Birds', props: { position: [0, 0, 0], count: 8, area: 30, height: 14, seed: 2 } },
      ],
    },
  },
  {
    id: 'office',
    title: 'Office floor',
    description: 'Desks, monitors, a whiteboard and the breakroom arcade.',
    stage: 'room',
    camera: { position: [9, 7, 11], target: [0, 0.8, 1] },
    world: {
      version: 1,
      meta: { title: 'Office floor' },
      time: '10:30',
      nodes: [
        ...[-3, 0, 3].flatMap((x, i): WorldNode[] => [
          { type: 'Desk', props: { position: [x, 0, -2], seed: 4 + i } },
          { type: 'Monitor', props: { position: [x, 0.75, -2.2], seed: 9 + i } },
          {
            type: 'OfficeChair',
            props: { position: [x, 0, -1.2], rotation: [0, Math.PI, 0], seed: 5 + i },
          },
        ]),
        {
          type: 'Person',
          props: { position: [0, 0, -1.2], rotation: [0, Math.PI, 0], pose: 'type', seed: 71 },
        },
        {
          type: 'Whiteboard',
          props: {
            position: [-6, 0, 0],
            rotation: [0, Math.PI / 2, 0],
            text: 'Q4: ship it',
            seed: 3,
          },
        },
        { type: 'Counter', props: { position: [5, 0, 4], length: 3, seed: 2 } },
        { type: 'CoffeeMachine', props: { position: [4.4, 1.1, 4], kind: 'espresso', seed: 1 } },
        { type: 'Fridge', props: { position: [7, 0, 4], seed: 2 } },
        { type: 'Sofa', props: { position: [-3, 0, 4], seed: 6, arms: 'square' } },
        {
          type: 'Tv',
          props: { position: [-3, 0, 6.5], rotation: [0, Math.PI, 0], mount: 'console', seed: 3 },
        },
        {
          type: 'ArcadeCabinet',
          props: { position: [1.5, 0, 6], rotation: [0, Math.PI, 0], seed: 4 },
        },
        { type: 'PoolTable', props: { position: [2, 0, 3], balls: 'scattered', seed: 2 } },
        { type: 'Plant', props: { position: [-6, 0, -4], seed: 8, height: 1.2 } },
        { type: 'Plant', props: { position: [7, 0, -4], seed: 12, height: 1.2 } },
      ],
    },
  },
  {
    id: 'campsite',
    title: 'Campsite at dusk',
    description: 'Tents around a fire, ringed by trees, with fog rolling in.',
    stage: 'plot',
    camera: { position: [8, 5, 10], target: [0, 0.8, 0] },
    world: {
      version: 1,
      meta: { title: 'Campsite at dusk' },
      time: '20:15',
      fog: { color: '#1c2333', near: 18, far: 70 },
      nodes: [
        { type: 'Terrain', props: { size: [70, 70], relief: 2, flatRadius: 9, seed: 21 } },
        { type: 'Campfire', anchor: 'ground', props: { position: [0, 0, 0], seed: 4 } },
        {
          type: 'Tent',
          anchor: 'ground',
          props: { position: [-3.5, 0, -2], rotation: [0, 0.7, 0], seed: 2 },
        },
        {
          type: 'Tent',
          anchor: 'ground',
          props: { position: [3.2, 0, -2.5], rotation: [0, -0.6, 0], seed: 5 },
        },
        {
          type: 'Rocks',
          anchor: 'ground',
          props: { position: [0, 0, 0], count: 9, spread: 1.4, size: 0.28, seed: 3 },
        },
        { type: 'Barrel', anchor: 'ground', props: { position: [-2, 0, 2.6] } },
        { type: 'Crate', anchor: 'ground', props: { position: [-1.2, 0, 3], seed: 6 } },
        {
          type: 'Person',
          anchor: 'ground',
          props: {
            position: [1.6, 0, 1.2],
            rotation: [0, -2.2, 0],
            pose: 'sit',
            kind: 'traveler',
            seed: 81,
          },
        },
        {
          type: 'Person',
          anchor: 'ground',
          props: { position: [-1.7, 0, 0.8], rotation: [0, 2, 0], pose: 'drink', seed: 92 },
        },
        ...ring(10, 13, (i, x, z) => ({
          type: 'Trees',
          anchor: 'ground' as const,
          props: { position: [x, 0, z], seed: 30 + i, iterations: 3 },
        })),
      ],
    },
  },
  {
    id: 'people',
    title: 'People showcase',
    description:
      'Six figures from one component: kinds, ages, poses and outfits from props and seeds.',
    stage: 'room',
    camera: { position: [0, 2.2, 6.5], target: [0, 1, 0] },
    world: {
      version: 1,
      meta: { title: 'People showcase' },
      nodes: [
        {
          type: 'Slab',
          props: { position: [0, 0, 0], size: [10, 4], shape: 'pill', thickness: 0.2, seed: 1 },
        },
        {
          type: 'Person',
          anchor: 'surface',
          props: { position: [-3.75, 0, 0], kind: 'merchant', pose: 'wave', seed: 3 },
        },
        {
          type: 'Person',
          anchor: 'surface',
          props: { position: [-2.25, 0, 0], kind: 'guard', seed: 8 },
        },
        {
          type: 'Person',
          anchor: 'surface',
          props: { position: [-0.75, 0, 0], kind: 'scholar', age: 'elder', seed: 13 },
        },
        {
          type: 'Person',
          anchor: 'surface',
          props: { position: [0.75, 0, 0], kind: 'sailor', skin: 'pirate', seed: 21 },
        },
        {
          type: 'Person',
          anchor: 'surface',
          props: { position: [2.25, 0, 0], kind: 'noble', outfit: 'dress', seed: 34 },
        },
        {
          type: 'Person',
          anchor: 'surface',
          props: { position: [3.75, 0, 0], age: 'child', kind: 'farmer', pose: 'play', seed: 55 },
        },
      ],
    },
  },
]

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id)
