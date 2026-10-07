---
title: "Birds"
summary: "A loose flock circling overhead, each bird flapping on its own seeded orbit."
category: component
component: birds
order: 100
---

## Add it

```bash
npx @runek/cli add birds
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.14.0`, `three@^0.184.0`.

## Use it

```tsx
import { Birds } from './runek/Birds'

<Birds position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Birds", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `count` | `number` | `10` |  |
| `area` | `number` | `20` | Orbit spread, in units. |
| `height` | `number` | `12` | Height, in units. |
| `speed` | `number` | `1` |  |
| `color` | `color` | `"#2a2a30"` |  |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/birds.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/birds.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add birds</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
