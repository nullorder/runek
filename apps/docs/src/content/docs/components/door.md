---
title: "Door"
summary: "Door panel within a frame."
category: component
component: door
order: 100
---

## Add it

```bash
npx @runek/cli add door
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`.

## Use it

```tsx
import { Door } from './runek/Door'

<Door position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Door", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `width` | `number` | `0.9` | Width, in units. |
| `height` | `number` | `2` | Height, in units. |
| `thickness` | `number` | `0.05` | Thickness, in units. |
| `openAngle` | `number` | `0` | Hinge angle in radians; 0 is closed. |
| `color` | `color` | palette `wood` | Defaults to the world palette's `wood` slot. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/door.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/door.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add door</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
