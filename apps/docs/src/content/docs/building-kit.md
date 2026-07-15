---
title: The building kit
summary: Compose buildings from parts — walls with openings, slabs with stairwells, stackable levels — and ship arrangements as composites.
category: guide
order: 19
---

Buildings in Runek are composed, not configured. The coded layer is a small kit
of parts; anything larger — a house, a room, a watchtower — is an *arrangement*
of those parts, expressed as data. This guide covers the kit's conventions and
the composite mechanism that packages arrangements.

## The parts

- **`Wall`** — one straight run with rectangular `openings` (doors, windows)
  cut into it. Solid piers, sills, and lintels are emitted around the holes,
  all in one fixed collider.
- **`Floor`** — a slab whose top surface is its origin, with an optional
  rectangular `opening` for a stairwell.
- **`Level`** — a ring of four walls plus an optional slab: the stackable
  unit. Sides take per-side configs (`openings`, `color`, `present: false` to
  leave a side open).
- **`Roof`** — flat or gable; a gable caps its own triangular ends so the
  attic isn't open to the sky.
- **`Door`**, **`Window`**, **`Staircase`** — the fittings that live in and
  around the openings.

## Anchors and stacking

Every part anchors so that composition is pure translation:

- A `Wall` sits base-down at `y = 0`, centered on its length.
- A `Floor`'s **top surface** is its origin (you stand at the component's `y`).
- A `Level`'s origin is the base of its walls.
- A `Roof`'s base rests at its origin.

So a two-level building is arithmetic, no measuring:

```tsx
<Level size={[9, 7]} height={3}
  walls={{ front: { openings: [{ width: 1, height: 2.1 }] } }} />
<Level position={[0, 3, 0]} size={[9, 7]} height={2.6}
  floor={{ opening: { x: 3.7, z: -1.95, width: 1.4, depth: 3.1 } }} />
<Staircase position={[3.7, 0, -3.4]} steps={10} totalHeight={3} depth={3} />
<Roof position={[0, 5.6, 0]} size={[9, 7]} />
```

Level 2 sits at `y = 3` (level 1's height); the roof at `y = 3 + 2.6`. The
upper slab's `opening` sits over the staircase run, so you can actually walk
up through it — the slab splits into strips around the hole and the colliders
match the visual exactly.

## Composites: arrangements as data

A **composite** is a named arrangement of nodes, held in the registry as JSON
instead of code. `House` and `Room` are composites: `runek add house` copies
`composites/house.json` plus the source of every part it references.

Place one in a world like any component — the renderer expands the
arrangement in place, wrapped in a group carrying your transform:

```json
{ "type": "House", "props": { "position": [12, 0, -4], "seed": 7 } }
```

Two behaviors worth knowing:

- **Seeds cascade.** An instance `seed` deterministically re-rolls every child
  in the arrangement that doesn't pin its own (`sub(seed, index)` under the
  hood). A street of houses with different seeds doesn't look copy-pasted.
- **Unpack to customize.** In the editor, select a composite instance and hit
  **Unpack**: the instance is replaced by a `Group` node carrying the
  arrangement as ordinary, editable children. Move the plant, delete a window,
  stretch a level — it's all plain nodes afterward. (There's no live link back
  to the definition; an unpacked house is yours.)

In JSX (outside worlds-as-data), render an arrangement through the same path
with `WorldNodes`:

```tsx
import { registry } from './runek/registry'
import { WorldNodes } from '@runek/core'

<WorldNodes nodes={[{ type: 'House', props: { seed: 7 } }]} registry={registry} />
```

## Authoring your own composite

Any world subtree is a composite waiting to happen. Arrange parts (in the
editor or by hand), then save the nodes under a `kind: "composite"` wrapper:

```json
{
  "kind": "composite",
  "name": "Watchtower",
  "description": "Three stacked levels under a flat roof.",
  "nodes": [
    { "type": "Level", "props": { "size": [4, 4], "height": 3 } },
    { "type": "Level", "props": { "position": [0, 3, 0], "size": [4, 4], "height": 3 } },
    { "type": "Level", "props": { "position": [0, 6, 0], "size": [4, 4], "height": 3 } },
    { "type": "Roof", "props": { "position": [0, 9, 0], "size": [4, 4], "style": "flat" } }
  ]
}
```

Register it under a name and it's placeable everywhere:

```ts
import watchtower from './composites/watchtower.json'

const registry = { ...parts, Watchtower: watchtower as unknown as CompositeDef }
```

Composites are static arrangements by design — no template variables. The
variation knobs are the instance `seed` and unpack-and-edit. (Deferred, by
decision: streaming/lazy instantiation for big worlds; the `bounds` field in
a definition is reserved for that.)
