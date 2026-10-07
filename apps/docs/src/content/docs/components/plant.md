---
title: "Plant"
summary: "Potted plant: a tapered planter and a seeded cluster of foliage."
category: component
component: plant
order: 100
---

## Add it

```bash
npx @runek/cli add plant
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`, `three@^0.184.0`.

## Use it

```tsx
import { Plant } from './runek/Plant'

<Plant position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Plant", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `height` | `number` | `0.7` | Height, in units. |
| `potColor` | `color` | palette `wood` | Planter color; defaults to the world palette's `wood` slot. |
| `foliageColor` | `color` | palette `foliage` | Foliage color; defaults to the world palette's `foliage` slot. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/plant.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/plant.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add plant</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
