---
title: "GlassRail"
summary: "A straight glass balustrade: a pane in a steel shoe with a round handrail, matching CurvedWall's glass. One cuboid collider the rail's height, so a player can't walk off an edge."
category: component
component: glass-rail
order: 100
---

## Add it

```bash
npx @runek/cli add glass-rail
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.16.0`.

## Use it

```tsx
import { GlassRail } from './runek/GlassRail'

<GlassRail position={[0, 0, 0]} width={3} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "GlassRail", "props": { "position": [0, 0, 0], "width": 3 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `2` | Length along local X, in units, centred on the origin. |
| `height` | `number` | `1.05` | To the top of the handrail, in units. |
| `glassColor` | `color` | `"#b7d8e8"` | Glass tint. |
| `color` | `color` | palette `metal` | Shoe and handrail. Defaults to the world palette's `metal` slot. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/glass-rail.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/glass-rail.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add glass-rail</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
