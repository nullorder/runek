---
title: "House"
summary: "Composite: a two-level dwelling arranged from parts (Levels, Door, Windows, Staircase, gable Roof, Plant). Unpack to customize."
category: component
component: house
order: 100
---

**House is a composite**: a data arrangement of parts, not code. `add`
copies the arrangement JSON plus the source of every part it references.

## Add it

```bash
npx @runek/cli add house
```

Pulls `door`, `level`, `plant`, `roof`, `staircase`, `window`.

## Use it

Place it in a world by type — the renderer expands the arrangement in place:

```json
{ "type": "House", "props": { "position": [0, 0, 0], "seed": 1 } }
```

Register the arrangement in your registry map next to the parts it uses:

```ts
import house from './runek/composites/house.json'

const registry = { /* …parts… */, House: house as unknown as CompositeDef }
```

An instance `seed` deterministically re-rolls every child that doesn't pin its
own. In the editor, **Unpack** replaces an instance with its editable
arrangement (a `Group` of ordinary nodes) for per-instance customization.

## Arrangement

```json
{
  "kind": "composite",
  "name": "House",
  "description": "A two-level dwelling arranged from parts: wall rings with door and window openings, a staircase through the upper floor, a gable roof, and a plant by the door.",
  "bounds": [9.6, 7.2, 7.6],
  "nodes": [
    {
      "type": "Level",
      "props": {
        "size": [9, 7],
        "height": 3,
        "walls": {
          "front": {
            "openings": [
              { "width": 1, "height": 2.1 },
              { "offset": -3, "width": 1.3, "height": 1.2, "sill": 1 },
              { "offset": 3, "width": 1.3, "height": 1.2, "sill": 1 }
            ]
          },
          "left": { "openings": [{ "width": 1.3, "height": 1.2, "sill": 1 }] },
          "right": { "openings": [{ "width": 1.3, "height": 1.2, "sill": 1 }] }
        }
      }
    },
    {
      "type": "Level",
      "props": {
        "position": [0, 3, 0],
        "size": [9, 7],
        "height": 2.6,
        "walls": {
          "front": {
            "openings": [
              { "offset": -3, "width": 1.3, "height": 1.1, "sill": 0.9 },
              { "offset": 3, "width": 1.3, "height": 1.1, "sill": 0.9 }
            ]
          },
          "left": { "openings": [{ "width": 1.3, "height": 1.1, "sill": 0.9 }] },
          "right": { "openings": [{ "width": 1.3, "height": 1.1, "sill": 0.9 }] }
        },
        "floor": { "opening": { "x": 3.7, "z": -1.95, "width": 1.4, "depth": 3.1 } }
      }
    },
    {
      "type": "Staircase",
      "props": {
        "position": [3.7, 0, -3.4],
        "steps": 10,
        "totalHeight": 3,
        "width": 1.3,
        "depth": 3
      }
    },
    {
      "type": "Door",
      "props": { "position": [0, 0, 3.5], "width": 1, "height": 2.1, "openAngle": -1.1 }
    },
    { "type": "Window", "props": { "position": [-3, 1, 3.5], "width": 1.3, "height": 1.2 } },
    { "type": "Window", "props": { "position": [3, 1, 3.5], "width": 1.3, "height": 1.2 } },
    {
      "type": "Window",
      "props": { "position": [-4.5, 1, 0], "rotation": [0, 1.5708, 0], "width": 1.3, "height": 1.2 }
    },
    {
      "type": "Window",
      "props": { "position": [4.5, 1, 0], "rotation": [0, 1.5708, 0], "width": 1.3, "height": 1.2 }
    },
    { "type": "Window", "props": { "position": [-3, 3.9, 3.5], "width": 1.3, "height": 1.1 } },
    { "type": "Window", "props": { "position": [3, 3.9, 3.5], "width": 1.3, "height": 1.1 } },
    {
      "type": "Window",
      "props": {
        "position": [-4.5, 3.9, 0],
        "rotation": [0, 1.5708, 0],
        "width": 1.3,
        "height": 1.1
      }
    },
    {
      "type": "Window",
      "props": {
        "position": [4.5, 3.9, 0],
        "rotation": [0, 1.5708, 0],
        "width": 1.3,
        "height": 1.1
      }
    },
    { "type": "Roof", "props": { "position": [0, 5.6, 0], "size": [9, 7], "style": "gable" } },
    { "type": "Plant", "props": { "position": [-3.5, 0, 2.3] } }
  ]
}
```

## Migrate

**v0.11.0 → v0.12.0.** `House` is no longer a coded component with parametric props — the registry name now resolves to a **composite**: a data arrangement of `Level`s, a `Door`, `Window`s, a `Staircase`, a gable `Roof`, and a `Plant`. The default house is a two-level dwelling with a working staircase.

<div class="migration">
<div class="migration__col">
<div class="migration__tag">v0.11.0</div>

```tsx
import { House } from './runek/House'

<House
  size={[9, 9]}
  height={3}
  roofStyle="gable"
  wallColor="#b8a888"
/>
```

</div>
<div class="migration__col migration__col--after">
<div class="migration__tag">v0.12.0</div>

```tsx
import { WorldNodes } from '@runek/core'
import { registry } from './runek/registry'

<WorldNodes
  nodes={[{ type: 'House', props: { seed: 7 } }]}
  registry={registry}
/>
```

</div>
</div>

- World files with default props need nothing: `{ "type": "House" }` keeps rendering, now by expanding the composite.
- Nodes that relied on the old parametric props (`size`, `height`, `roofStyle`, `wallColor`, `roofColor`) can bake the exact old single-storey look with [`scripts/migrate-buildings.mjs`](https://github.com/nullorder/runek/blob/main/scripts/migrate-buildings.mjs), which replaces each node with the equivalent arrangement of parts.
- To customize a house, **Unpack** the instance in the editor, or edit `composites/house.json` after `runek add house`. An instance `seed` re-rolls the arrangement.
- The `HouseProps` type no longer exists.

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/house.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/house.json</span>
<span class="manifest-card__hint">Self-contained JSON: the inlined arrangement plus resolved dependencies, exactly what <code>runek add house</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
