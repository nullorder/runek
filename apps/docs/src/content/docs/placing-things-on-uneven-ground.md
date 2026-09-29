---
title: Placing things on uneven ground
summary: Anchor nodes to the terrain, drop them in the editor, and catch buried or floating props with runek check-world.
category: guide
order: 21
---

`Terrain` displaces its surface with seeded noise, an island falloff, and a flat `flatRadius` pad. That's deterministic, but a world file only knows absolute numbers, so a prop placed at `y: 0.42` is right on the pad and wrong everywhere else. On a real island world, 16 of 56 people placed that way ended up underground past the pad, one buried to the head, alongside crates, signposts, a tent, and two houses nobody had noticed.

Runek makes the ground queryable instead. Every surface-providing component (`Terrain`, `Shore`, `Dock`, `Floor`, `Slab`) publishes its walkable top as a pure function of its props, the same function that builds its mesh. So the height at any (x, z) is known exactly, without running physics or raycasting.

## Anchor a node

Give a node an `anchor`, and its `position[1]` becomes an offset above the ground at its (x, z):

```json
{ "type": "Person", "anchor": "ground", "props": { "position": [3.2, 0, 115.4], "seed": 123 } }
```

- `"ground"` stands on terrain (`Terrain`, `Shore`).
- `"surface"` stands on whatever is highest: terrain, or a deck like a `Dock`, `Floor`, or `Slab`. Use it for people on a jetty or crates in a house.

`0` stands on the ground wherever the node is; `0.5` hovers half a unit above it. Any node can be anchored, including a `Group` or a composite such as `House`, and anchors resolve through parent transforms. The world file keeps the offset, never the resolved height, so reseeding or moving the terrain re-seats everything anchored to it. `Player` can be anchored too: an anchored spawn at `[x, 1.2, z]` starts 1.2 above whatever is there.

Anchors resolve in `WorldRenderer` and `WorldEditor`; the component itself just receives an absolute `position`. Under a parent tilted by more than about a degree, "the ground below" stops being well-defined, so the anchor is treated as absolute and a warning is logged.

## Query the ground in code

Inside a data world, `useGround()` returns the query: the highest surface at (x, z), or the world's `ground` baseline when nothing is there.

```tsx
import { useGround } from '@runek/core'

const groundAt = useGround()
const y = groundAt(x, z) // terrain or deck
const soil = groundAt(x, z, { kinds: ['terrain'] })
```

Outside React (scripts, tests, build steps), the same query is pure and imports from the React-free `@runek/core/data` entry:

```ts
import { createGroundIndex } from '@runek/core/data'
import { dockSurface } from './runek/surfaces/dock'
import { terrainSurface } from './runek/surfaces/terrain'

const ground = createGroundIndex(world, {
  Terrain: { surface: terrainSurface },
  Dock: { surface: dockSurface },
})
ground.groundAt(12, -40)
```

The surface modules are plain TypeScript with no React or three.js, so they run in Node as-is.

## Drop to ground in the editor

With a node selected, the editor toolbar offers:

- **Drop to ground** / **Drop to surface**: seat the selection on the terrain (or the highest surface) under it, writing an absolute Y. Undoable.
- **Anchor**: switch between none, ground, and surface. The node stays where it is; its Y converts between an absolute height and an offset.

Dragging an anchored node with the move gizmo slides it along the ground. Dragging its Y handle changes the offset instead.

## Check a world

`runek check-world` flags every ground-standing node that is buried or floating, plus open water that stands above its shore:

```bash
npx @runek/cli check-world public/world.json
#   buried Windmill [14] at (-26, 0.42, 96) is 2.08 below the ground (2.5); set position[1] to 2.498, or anchor it
#   floating Bench [91] at (-92.3, 17.05, 157) floats 2.02 above the surface (15.03); set position[1] to 15.025, or anchor it
```

`--fix` writes the suggested heights into the file, and `--strict` exits non-zero so you can put it in CI next to your other checks. Only components that declare themselves ground-sitting are checked (people, trees, furniture, buildings), and not birds, clouds, or signs hung in the air. Anchored nodes pass by construction.

Two things it can't know: a prop stacked on another prop (a crate on a crate) or standing on something that isn't a surface (a rock, a cliff top) reads as floating. And trees on a slope are often sunk a little on purpose so the downhill side doesn't hover; `--tolerance` widens the allowed gap.
