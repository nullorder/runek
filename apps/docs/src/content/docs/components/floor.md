---
title: "Floor"
summary: "Flat floor slab with a fixed collider; optional stairwell opening."
category: component
component: floor
order: 100
---

## Add it

```bash
npx @runek/cli add floor
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`.

## Use it

```tsx
import { Floor } from './runek/Floor'

<Floor position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Floor", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` |  | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `size` | `[number, number]` | `[8, 8]` | `[width, depth]` in units. The top surface sits at the component origin. |
| `thickness` | `number` | `0.2` | Thickness, in units. |
| `opening` | `FloorOpening` |  | A hole in the slab (stairwell); the slab splits into strips around it. |
| `color` | `color` | palette `floor` | Defaults to the world palette's `floor` slot. |

### `FloorOpening`

| Prop | Type | Default | Description |
|---|---|---|---|
| `x` | `number` |  | Hole center offset from the slab center along X, in units. |
| `z` | `number` |  | Hole center offset from the slab center along Z, in units. |
| `width` | `number` | **required** |  |
| `depth` | `number` | **required** |  |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/floor.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/floor.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add floor</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
