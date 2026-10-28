---
title: "GlassWall"
summary: "A floor-to-ceiling glass partition: panes between slim mullions in a frame, with an optional doorway and a pane over it. A cuboid collider either side of the doorway."
category: component
component: glass-wall
order: 100
---

## Add it

```bash
npx @runek/cli add glass-wall
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.16.0`.

## Use it

```tsx
import { GlassWall } from './runek/GlassWall'

<GlassWall position={[0, 0, 0]} width={4} door={{ "offset": 0.8, "width": 1 }} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "GlassWall", "props": { "position": [0, 0, 0], "width": 4, "door": { "offset": 0.8, "width": 1 } } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `4` | Length along local X, in units, centred on the origin. |
| `height` | `number` | `3` | Height, in units. |
| `door` | `GlassWallDoor` |  | A doorway left open in it, with a pane over it to the top. |
| `pane` | `number` | `1.2` | Widest a pane runs before a mullion, in units. |
| `glassColor` | `color` | `"#b7d8e8"` | Glass tint. |
| `opacity` | `number` | `0.22` | How much the glass hides, 0 clear to 1 opaque. Dark and high makes a smoked partition. |
| `color` | `color` | palette `metal` | Frame and mullions. Defaults to the world palette's `metal` slot. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |

### `GlassWallDoor`

| Prop | Type | Default | Description |
|---|---|---|---|
| `offset` | `number` |  | From the middle of the wall along X. |
| `width` | `number` |  |  |
| `height` | `number` |  |  |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/glass-wall.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/glass-wall.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add glass-wall</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
