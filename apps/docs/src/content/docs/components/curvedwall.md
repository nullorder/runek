---
title: "CurvedWall"
summary: "An arc of wall around the origin — solid concrete or a floor-to-ceiling glass curtain wall with mullions. Compose several arcs to leave door gaps; chords carry cuboid colliders."
category: component
component: curvedwall
order: 100
---

## Add it

```bash
npx @runek/cli add curvedwall
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { CurvedWall } from './runek/CurvedWall'

<CurvedWall position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "CurvedWall", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `radius` | `number` | `6` | Arc centerline radius, in units. The component origin is the circle's center. |
| `arc` | `number` | `1.5707963267948966` | Sweep angle in radians, centered on the local +Z axis. |
| `height` | `number` | `3` | Height, in units. |
| `thickness` | `number` | `0.15` | Thickness, in units. |
| `style` | `"solid" \| "glass"` | `"solid"` | `glass` renders a transparent curtain wall with mullions; `solid` a plain wall. |
| `segments` | `number` |  | Chord segments; defaults from `radius × arc`, more segments reading as smoother. |
| `color` | `color` | palette `wall` | Solid wall color; defaults to the world palette's `wall` slot. |
| `glassColor` | `color` | `"#b7d8e8"` | Glass tint (glass style). |
| `frameColor` | `color` | palette `metal` | Mullion and rail color (glass style); defaults to the palette's `metal` slot. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/curvedwall.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/curvedwall.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add curvedwall</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
