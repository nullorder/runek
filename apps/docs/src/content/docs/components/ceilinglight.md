---
title: "CeilingLight"
summary: "A ceiling fitting hanging from its origin: a flush dome, a pendant shade on a cord, or an aimed spot can. Can light only after dusk."
category: component
component: ceilinglight
order: 100
---

## Add it

```bash
npx @runek/cli add ceilinglight
```

Pulls `@runek/core@^0.15.0`, `three@^0.184.0`.

## Use it

```tsx
import { CeilingLight } from './runek/CeilingLight'

<CeilingLight position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "CeilingLight", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `kind` | `"flush" \| "pendant" \| "spot"` |  | Seeded when unset. |
| `shade` | `"dome" \| "cone" \| "drum" \| "globe"` |  | Pendant only; seeded when unset. |
| `drop` | `number` | `0.6` | Pendant cord length from the ceiling to the shade, in units. |
| `size` | `number` | `0.36` | Shade size across, in units. |
| `color` | `color` |  | Canopy, cord, and can; defaults to the palette's `metal`. |
| `shadeColor` | `color` |  | The shade. Seeded when unset. |
| `lightColor` | `color` | `"#ffe2b8"` | The light and the glowing bulb. |
| `intensity` | `number` | `12` | Light strength. |
| `on` | `boolean` | `true` | Switched on. |
| `nightOnly` | `boolean` | `false` | Light only while the world's sun is down. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/ceilinglight.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/ceilinglight.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add ceilinglight</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
