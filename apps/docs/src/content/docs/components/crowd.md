---
title: "Crowd"
summary: "People on a street in bulk: hooded figures in long coats walking their lanes there and back, each with one small light at the collar, stepping round the player. Where each walks comes from the world clock and `seed` alone, so every viewer sees the same crowd. Three instanced draws however many walk; no colliders."
category: component
component: crowd
order: 100
---

## Add it

```bash
npx @runek/cli add crowd
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { Crowd } from './runek/Crowd'

<Crowd position={[0, 0, 0]} count={12} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Crowd", "props": { "position": [0, 0, 0], "count": 12, "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Where the lanes' origin stands [x, y, z] in units: lanes are in the node's own frame. |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Rotation [x, y, z] in radians, turning the lanes with it. |
| `seed` | `number` | `1` | Deals out each walker: which lane, where on it, how fast, how tall, what they wear. |
| `count` | `number` | `24` | How many walk. |
| `lanes` | `CrowdLane[]` | `[{ "y": 0, "points": [[-8, 0], [8, 0]] }]` | The paths they walk, in the node's frame. A walker keeps to one lane, going to its end and back. One 16-unit lane along X by default. |
| `speed` | `[number, number]` | `[0.9, 1.5]` | Slowest and fastest a walker goes, in units a second. |
| `spread` | `number` | `0.9` | How far to either side of its lane a walker keeps, in units, so a crowd is not a queue. |
| `berth` | `number` | `1.3` | How far round the player a walker steps aside, in units. 0 for none. |

### `CrowdLane`

| Prop | Type | Default | Description |
|---|---|---|---|
| `y` | `number` | **required** | The ground along it. |
| `points` | `[number, number][]` | **required** | Its corners, each [x, z]. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/crowd.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/crowd.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add crowd</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
