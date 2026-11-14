---
title: "StreetLamp"
summary: "A street lamp on an arm: a pole, a hot lens at the world's lamp luminance level, a haze cone under the head and a soft pool of light on the street, every lamp's cone and pool sharing two instanced draws. The real light comes from the world's light pool. One thin collider for the pole."
category: component
component: street-lamp
order: 100
---

## Add it

```bash
npx @runek/cli add street-lamp
```

Pulls `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { StreetLamp } from './runek/StreetLamp'

<StreetLamp position={[0, 0, 0]} height={6} arm={1.8} color="#ffa64d" />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "StreetLamp", "props": { "position": [0, 0, 0], "height": 6, "arm": 1.8, "color": "#ffa64d" } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Base of the pole [x, y, z] in units. The arm reaches along local +X. |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation. |
| `height` | `number` | `8` | Pole height to the arm, in units. |
| `arm` | `number` | `2.4` | How far the arm reaches out from the pole, in units. |
| `color` | `color` | `"#dfe8ff"` | Lamp color. A cool white by default: the city lights its streets like day. |
| `poleColor` | `color` |  | Pole, arm and head color. Defaults to the world palette's `metal`. |
| `intensity` | `number` | `350` | Candela toward the street, when the world lends this lamp a real light. |
| `light` | `boolean` | `true` | Ask the world's light pool for a real light. The lens, cone and pool glow either way. |
| `cone` | `boolean` | `true` | Draw the haze cone under the head. |
| `haze` | `number` | `0.06` | Peak luminance of the haze cone (scene-linear), times the world's `lamp` level. |
| `pool` | `boolean` | `true` | Draw the soft pool on the street under the head, for lamps the pool has no light for. |
| `poolRadius` | `number` | `6` | Radius of that pool, in units. |
| `poolOn` | `"ground" \| "base"` | `"ground"` | What the pool lies on. `ground` is the world's ground, for a lamp on a pavement whose arm reaches out over the street below it. `base` is whatever the lamp itself stands on: a plaza, a lawn, a roof. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/street-lamp.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/street-lamp.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add street-lamp</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
