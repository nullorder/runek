---
title: "Hologram"
summary: "A plaza centrepiece: a pedestal, a beam of light with scan lines climbing it, and in it a wire cage turning round three rings that keep time (once a minute, once an hour, once every `round` seconds) off the world clock. The pedestal has a cylinder collider."
category: component
component: hologram
order: 100
---

## Add it

```bash
npx @runek/cli add hologram
```

Pulls `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { Hologram } from './runek/Hologram'

<Hologram position={[0, 0, 0]} color="#39ff88" round={600} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Hologram", "props": { "position": [0, 0, 0], "color": "#39ff88", "round": 600 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | The middle of the pedestal's foot [x, y, z] in units. |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract. Every hologram keeps the same time. |
| `radius` | `number` | `1.6` | Radius of the pedestal, in units. |
| `height` | `number` | `6.5` | How high the middle of the figure hangs over the pedestal's foot, in units. |
| `size` | `number` | `2.2` | Radius of the figure, in units. |
| `color` | `color` | `"#3d5bff"` | The beam and the figure's cage, lit at the world's `sign` and `tube` levels. |
| `accent` | `color` | `"#f4f6fb"` | The rings that keep time. |
| `round` | `number` | `1440` | Seconds the slow ring takes to go round once: a district's power round, say. |
| `light` | `boolean` | `true` | Ask the world's light pool for a real light at the figure. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/hologram.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/hologram.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add hologram</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
