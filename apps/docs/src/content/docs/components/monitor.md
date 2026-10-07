---
title: "Monitor"
summary: "A desk monitor on a foot, plate, or legs. Switched on, the screen glows in its own color with a few seeded windows and lines of text on it, all geometry."
category: component
component: monitor
order: 100
---

## Add it

```bash
npx @runek/cli add monitor
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`, `three@^0.184.0`.

## Use it

```tsx
import { Monitor } from './runek/Monitor'

<Monitor position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Monitor", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `0.6` | Screen width, in units. |
| `aspect` | `number` | `1.7777777777777777` | Width over height. |
| `stand` | `"legs" \| "foot" \| "plate"` |  | Seeded when unset. |
| `screen` | `color` |  | The screen's glow when on. Seeded from a few calm tints when unset. |
| `on` | `boolean` | `true` | Lit, showing a few seeded windows; off, a dark glass. |
| `color` | `color` |  | Bezel and stand; defaults to the palette's `metal`. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/monitor.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/monitor.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add monitor</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
