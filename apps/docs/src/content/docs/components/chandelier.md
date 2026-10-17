---
title: "Chandelier"
summary: "A hanging chandelier: a chain, a turned brass body, one or two rings of curved arms with candle bulbs, and optional glass drops. Instanced, with one shared light; can light only after dusk."
category: component
component: chandelier
order: 100
---

## Add it

```bash
npx @runek/cli add chandelier
```

Pulls `@runek/core@^0.15.0`, `three@^0.184.0`.

## Use it

```tsx
import { Chandelier } from './runek/Chandelier'

<Chandelier position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Chandelier", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `arms` | `number` |  | Arms on the lower tier. Seeded (5 to 8) when unset. |
| `tiers` | `1 \| 2` |  | One ring of arms, or two (the upper one smaller). Seeded when unset. |
| `radius` | `number` | `0.45` | Reach of the lower arms from the center, in units. |
| `drop` | `number` | `0.4` | Chain length from the ceiling to the body, in units. |
| `crystals` | `boolean` |  | Glass drops hanging from the arms. Seeded when unset. |
| `color` | `color` |  | Frame, arms, and cups; defaults to the palette's `accent` (brass). |
| `lightColor` | `color` | `"#ffd9a0"` | The light and the glowing bulb. |
| `intensity` | `number` | `22` | Light strength. |
| `on` | `boolean` | `true` | Switched on. |
| `nightOnly` | `boolean` | `false` | Light only while the world's sun is down. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/chandelier.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/chandelier.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add chandelier</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
