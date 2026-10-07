---
title: "Fridge"
summary: "A kitchen fridge with a top or bottom freezer or one tall door, bar handles, and a seeded enamel or steel finish."
category: component
component: fridge
order: 100
---

## Add it

```bash
npx @runek/cli add fridge
```

Pulls `@react-three/drei@^10.7.7`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`.

## Use it

```tsx
import { Fridge } from './runek/Fridge'

<Fridge position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Fridge", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `0.7` | Width, in units. |
| `height` | `number` | `1.8` | Height, in units. |
| `depth` | `number` | `0.68` | Depth, in units. |
| `layout` | `"top" \| "bottom" \| "single"` |  | Seeded when unset. |
| `color` | `color` |  | Body color. Seeded between an enamel white and brushed steel when unset. |
| `handleColor` | `color` |  | Handles; defaults to the palette's `metal`. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/fridge.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/fridge.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add fridge</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
