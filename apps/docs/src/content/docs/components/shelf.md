---
title: "Shelf"
summary: "Wall shelf with planks."
category: component
component: shelf
order: 100
---

## Add it

```bash
npx @runek/cli add shelf
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`.

## Use it

```tsx
import { Shelf } from './runek/Shelf'

<Shelf position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Shelf", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `width` | `number` | `1` | Width, in units. |
| `height` | `number` | `1.8` | Height, in units. |
| `depth` | `number` | `0.3` | Depth, in units. |
| `shelves` | `number` | `4` |  |
| `color` | `color` | palette `wood` | Defaults to the world palette's `wood` slot. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/shelf.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/shelf.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add shelf</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
