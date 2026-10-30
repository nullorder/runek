---
title: "Umbrella"
summary: "A beach umbrella: a weighted base, a wooden pole and a canopy of alternating panels on ribs, sagging a little between them. Leans with tilt; the pole runs up through a Table. One cylinder collider round the pole."
category: component
component: umbrella
order: 100
---

## Add it

```bash
npx @runek/cli add umbrella
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.16.0`, `three@^0.184.0`.

## Use it

```tsx
import { Umbrella } from './runek/Umbrella'

<Umbrella position={[0, 0, 0]} tilt={0.2} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Umbrella", "props": { "position": [0, 0, 0], "tilt": 0.2, "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `radius` | `number` | `1.1` | Canopy radius, in units. |
| `height` | `number` | `2.1` | From the ground to the canopy's rim, in units. |
| `tilt` | `number` | `0` | Lean toward local +Z, in radians, from the foot of the pole. |
| `color` | `color` |  | Every other panel. Seeded from beach colours when unset. |
| `stripeColor` | `color` | `"#f4f1ea"` | The panels between. |
| `panels` | `number` | `8` | Canopy panels, rounded to an even count so the stripes alternate all the way round. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/umbrella.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/umbrella.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add umbrella</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
