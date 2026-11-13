---
title: "Rain"
summary: "The weather over a whole world, drawn only around the camera: rain streaks and splashes, snowflakes, and rings on every `WetStreet`'s puddles, as hard as a `weather` function says (`weatherAt` gives the weather as a pure function of a clock). It stays out from under roofs through a depth map of the still world drawn from above in its first seconds. WebGLRenderer only."
category: component
component: rain
order: 100
---

## Add it

```bash
npx @runek/cli add rain
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { Rain } from './runek/Rain'

<Rain position={[0, 0, 0]} streaks={4000} splashes={200} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Rain", "props": { "position": [0, 0, 0], "streaks": 4000, "splashes": 200 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` |  | Accepted for the component contract. Rain follows the camera, so it has no place of its own. |
| `rotation` | `[x, y, z]` |  | Accepted for the component contract. |
| `seed` | `number` |  | Seeds where each streak, splash and flake starts. |
| `streaks` | `number` |  | Streaks in the air around the camera when it rains its hardest. Lighter rain draws fewer. |
| `splashes` | `number` |  | Splashes on the ground around the camera in the heaviest rain, 0 for none. |
| `flakes` | `number` |  | Snowflakes in the air around the camera when it snows its hardest, 0 for none. |
| `ripples` | `boolean` |  | Ring the puddles of every `WetStreet`. |
| `weather` | `function` (code only) |  | The weather now, asked every frame: `weatherAt` on a clock, most often. Left out, it rains hard and steadily and the streets stay soaked. JSX only. |
| `bounds` | `[number, number, number, number]` |  | The part of the world rain can fall on, [minX, minZ, maxX, maxZ] in units. Outside it, rain falls through everything. |
| `cover` | `number` |  | Texels along each side of the cover map, which records the highest surface over every spot. |
| `floor` | `number` |  | The lowest anything falls, in units: the surface of a sea, which no cover map holds since water is not a still part of the world. Rain ends there and splashes on it, inside the bounds and out. Unset, there is no such floor. |
| `color` | `color` |  | Rain color. A cool grey by default, lit as if by the street. |
| `onMemory` | `function` (code only) |  | Called with the GPU bytes the cover map holds, and with 0 when it is let go. JSX only. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/rain.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/rain.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add rain</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
