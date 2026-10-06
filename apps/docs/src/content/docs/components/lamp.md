---
title: "Lamp"
summary: "Lamp that emits a point light."
category: component
component: lamp
order: 100
---

## Add it

```bash
npx @runek/cli add lamp
```

Pulls `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Lamp } from './runek/Lamp'

<Lamp position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Lamp", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `height` | `number` | `1.6` | Height, in units. |
| `color` | `color` | palette `metal` | Base + pole color. Defaults to the world palette's `metal` slot. |
| `shadeColor` | `color` | `"#e9d8a6"` |  |
| `lightColor` | `color` | `"#ffe8c2"` |  |
| `intensity` | `number` | `18` |  |
| `flicker` | `number` | `0.08` | Candle-like intensity flicker, 0–1; 0 holds the light steady. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/lamp.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/lamp.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add lamp</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
