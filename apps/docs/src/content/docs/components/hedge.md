---
title: "Hedge"
summary: "A trimmed green wall with seeded surface tufts; blocks like a Wall."
category: component
component: hedge
order: 100
---

## Add it

```bash
npx @runek/cli add hedge
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`, `three@^0.184.0`.

## Use it

```tsx
import { Hedge } from './runek/Hedge'

<Hedge position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Hedge", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `length` | `number` | `4` | Length along local X, in units. |
| `height` | `number` | `1.2` | Height, in units. |
| `depth` | `number` | `0.6` | Depth, in units. |
| `color` | `color` | palette `foliage` | Defaults to the world palette's `foliage` slot. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/hedge.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/hedge.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add hedge</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
