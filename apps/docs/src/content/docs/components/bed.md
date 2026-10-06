---
title: "Bed"
summary: "Bed with a frame, mattress, pillows, and a headboard."
category: component
component: bed
order: 100
---

## Add it

```bash
npx @runek/cli add bed
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`.

## Use it

```tsx
import { Bed } from './runek/Bed'

<Bed position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Bed", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `width` | `number` | `1.4` | Width, in units. |
| `length` | `number` | `2` | Length, in units. |
| `color` | `color` | palette `wood` | Frame color; defaults to the world palette's `wood` slot. |
| `beddingColor` | `color` | palette `fabric` | Bedding color; defaults to the world palette's `fabric` slot. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/bed.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/bed.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add bed</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
