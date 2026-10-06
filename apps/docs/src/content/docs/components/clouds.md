---
title: "Clouds"
summary: "Drifting clouds built from clustered soft blobs (no textures); layer above a Sky."
category: component
component: clouds
order: 100
---

## Add it

```bash
npx @runek/cli add clouds
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Clouds } from './runek/Clouds'

<Clouds position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Clouds", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `count` | `number` | `8` | Number of clouds. |
| `area` | `[number, number]` | `[80, 80]` | Spread `[width, depth]`, in units. |
| `height` | `number` | `24` | Height above the origin, in units. |
| `drift` | `number` | `0.6` | Drift speed along +X, in units/sec (0 holds still). |
| `color` | `color` | `"#eef2f7"` |  |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/clouds.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/clouds.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add clouds</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
