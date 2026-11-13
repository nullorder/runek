---
title: "SteamVent"
summary: "Steam off a manhole or out of a wall vent: soft puffs that rise, spread, lean and thin away, each a pure function of the world clock and `seed`. One instanced draw, plus the lid. Decorative: no collider."
category: component
component: steam-vent
order: 100
---

## Add it

```bash
npx @runek/cli add steam-vent
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { SteamVent } from './runek/SteamVent'

<SteamVent position={[0, 0, 0]} puffs={20} rise={4} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "SteamVent", "props": { "position": [0, 0, 0], "puffs": 20, "rise": 4, "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Where the steam comes out [x, y, z] in units: the middle of a manhole, or the mouth of a wall vent. |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Sets each puff apart from the next, and this vent from every other. |
| `puffs` | `number` | `14` | How many puffs are in the air at once. |
| `rise` | `number` | `3.2` | How high a puff rises before it is gone, in units. |
| `spread` | `number` | `1.1` | How far a puff has spread by then, in units. |
| `period` | `number` | `4.5` | Seconds a puff takes to rise and thin out. |
| `color` | `color` | `"#c9d2e6"` | Steam color: it takes the color of the light around it. |
| `strength` | `number` | `1` | How thick it is, 0 (nothing) to 1. |
| `grate` | `boolean` | `true` | Draw the manhole it comes from: a dark lid with a rim, `radius` across. |
| `radius` | `number` | `0.42` | Radius of the lid and of the column of steam at its foot, in units. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/steam-vent.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/steam-vent.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add steam-vent</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
