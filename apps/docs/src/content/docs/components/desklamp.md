---
title: "DeskLamp"
summary: "A banker's desk lamp: a brass base and stem under a cased glass shade with a pull chain, pooling light on the desk. Can light only after dusk."
category: component
component: desklamp
order: 100
---

## Add it

```bash
npx @runek/cli add desklamp
```

Pulls `@runek/core@^0.15.0`.

## Use it

```tsx
import { DeskLamp } from './runek/DeskLamp'

<DeskLamp position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "DeskLamp", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `0.3` | Shade width, in units. |
| `shadeColor` | `color` |  | The glass shade. Seeded (mostly library green) when unset. |
| `color` | `color` |  | Base, stem, and harp; defaults to the palette's `accent` (brass). |
| `lightColor` | `color` | `"#ffe2b0"` | The light and the glowing bulb. |
| `intensity` | `number` | `3` | Light strength. |
| `on` | `boolean` | `true` | Switched on. |
| `nightOnly` | `boolean` | `false` | Light only while the world's sun is down. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/desklamp.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/desklamp.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add desklamp</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
