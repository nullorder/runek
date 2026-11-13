---
title: "FlyingTraffic"
summary: "Lanes of hovercars over a street, decks of lanes each way, every car placed by the world clock and `seed` so every viewer sees the same traffic. Three instanced draws however many cars; no colliders."
category: component
component: flying-traffic
order: 100
---

## Add it

```bash
npx @runek/cli add flying-traffic
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { FlyingTraffic } from './runek/FlyingTraffic'

<FlyingTraffic position={[0, 0, 0]} cars={16} levels={[0, 8]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "FlyingTraffic", "props": { "position": [0, 0, 0], "cars": 16, "levels": [0, 8], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 40, 0]` | The middle of the lanes [x, y, z] in units, at the height of the lowest one. Lanes run along local Z. |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Deals out each car's lane, speed, paint and where on the lane it starts. |
| `length` | `number` | `480` | How long the lanes are, in units. Cars leave one end and come in at the other, so make it longer than the fog lets anyone see. |
| `cars` | `number` | `28` | How many cars fly. |
| `lanes` | `number` | `2` | Lanes side by side going each way. |
| `spacing` | `number` | `7` | How far apart lanes are, side to side, in units. |
| `levels` | `number[]` | `[0, 9, 20]` | Heights of the decks of lanes above `position`, in units. |
| `speed` | `[number, number]` | `[16, 34]` | Slowest and fastest a car flies, in units a second. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/flying-traffic.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/flying-traffic.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add flying-traffic</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
