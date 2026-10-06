---
title: "Path"
summary: "A meandering ribbon trail from seeded waypoints; decorative, laid just over the ground."
category: component
component: path
order: 100
---

## Add it

```bash
npx @runek/cli add path
```

Pulls `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Path } from './runek/Path'

<Path position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Path", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `length` | `number` | `12` | Length along local Z, in units. |
| `width` | `number` | `1.4` | Width, in units. |
| `meander` | `number` | `1.2` | Lateral meander amplitude, in units. |
| `rise` | `number` | `0` | Total height climbed from the near end (local −Z) to the far end (+Z), in units. For a trail that gains height as it winds; the ribbon rises linearly along its length. |
| `heights` | `number[]` |  | Explicit elevation profile, in units: evenly spaced samples from the near end (local −Z) to the far end (+Z), linearly interpolated along the ribbon. Overrides `rise`. Author it from the terrain the trail crosses so the ribbon hugs the ground it climbs. |
| `color` | `color` | palette `ground` | Defaults to the world palette's `ground` slot. |
| `segments` | `number` | `48` |  |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/path.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/path.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add path</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
