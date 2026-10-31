---
title: "KitchenUnits"
summary: "A fitted kitchen run: seeded door and drawer fronts under one worktop, an optional sink and a hob over an oven, wall units with a hood, and an overhang for an island. One cuboid collider."
category: component
component: kitchen-units
order: 100
---

## Add it

```bash
npx @runek/cli add kitchen-units
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { KitchenUnits } from './runek/KitchenUnits'

<KitchenUnits position={[0, 0, 0]} length={3} sink={1} hob={3} wall={true} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "KitchenUnits", "props": { "position": [0, 0, 0], "length": 3, "sink": 1, "hob": 3, "wall": true, "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `length` | `number` | `3` | Length along local X, in units, rounded to whole units. |
| `unitWidth` | `number` | `0.6` | One unit's width, in units. |
| `height` | `number` | `0.9` | Worktop height, in units. |
| `depth` | `number` | `0.6` | Depth along local Z, in units. The fronts face +Z. |
| `sink` | `number` |  | Which unit, counted from the -X end, holds the sink. |
| `hob` | `number` |  | Which unit holds the hob, with the oven under it and the hood over it. |
| `wall` | `boolean` | `false` | Wall units over the run, with a hood over the hob. |
| `overhang` | `number` | `0` | How far the worktop reaches past the back, in units: knee room for stools along an island. |
| `color` | `color` |  | Fronts. Seeded from a few kitchen finishes when unset. |
| `topColor` | `color` | `"#d9d5cc"` | The worktop. |
| `metalColor` | `color` | `"#b9bdc1"` | Handles, sink, tap and hood. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/kitchen-units.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/kitchen-units.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add kitchen-units</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
