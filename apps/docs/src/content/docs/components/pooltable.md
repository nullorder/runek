---
title: "PoolTable"
summary: "A pool table with rails, cushions, six pockets, and sixteen instanced balls, racked or scattered mid-game."
category: component
component: pooltable
order: 100
---

## Add it

```bash
npx @runek/cli add pooltable
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { PoolTable } from './runek/PoolTable'

<PoolTable position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "PoolTable", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `length` | `number` | `2.5` | Outer length along local X, in units. |
| `width` | `number` | `1.4` | Outer width along local Z, in units. |
| `height` | `number` | `0.8` | Height of the playing surface, in units. |
| `balls` | `"none" \| "racked" \| "scattered"` |  | Seeded when unset. |
| `color` | `color` |  | The cloth. Seeded from a few classic colors when unset. |
| `frameColor` | `color` |  | Rails and legs; defaults to the palette's `wood`. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/pooltable.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/pooltable.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add pooltable</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
