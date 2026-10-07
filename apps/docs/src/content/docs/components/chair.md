---
title: "Chair"
summary: "Chair with seat, back, and legs."
category: component
component: chair
order: 100
---

## Add it

```bash
npx @runek/cli add chair
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`.

## Use it

```tsx
import { Chair } from './runek/Chair'

<Chair position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Chair", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `width` | `number` | `0.45` | Width, in units. |
| `depth` | `number` | `0.45` | Depth, in units. |
| `seatHeight` | `number` | `0.45` |  |
| `backHeight` | `number` | `0.5` |  |
| `color` | `color` | palette `wood` | Defaults to the world palette's `wood` slot. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/chair.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/chair.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add chair</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
