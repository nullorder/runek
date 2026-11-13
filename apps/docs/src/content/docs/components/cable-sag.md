---
title: "CableSag"
summary: "A cable sagging across a street between two anchors: a parabola cut into straight pieces. Drawn by the world's shared facade-kit meshes. Decorative: no collider."
category: component
component: cable-sag
order: 100
---

## Add it

```bash
npx @runek/cli add cable-sag
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { CableSag } from './runek/CableSag'

<CableSag position={[0, 0, 0]} span={12} sag={0.8} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "CableSag", "props": { "position": [0, 0, 0], "span": 12, "sag": 0.8 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | The near anchor [x, y, z] in units. The cable crosses along local +Z. |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Rotation [x, y, z] in radians. Turn about Y to aim it across the street. |
| `seed` | `number` |  | Accepted for the component contract. This component has no seeded variation. |
| `span` | `number` | `27` | Distance to the far anchor, in units. |
| `sag` | `number` | `1.4` | How far the middle hangs below the straight line, in units. |
| `drop` | `number` | `0` | How much higher (or lower, when negative) the far anchor sits, in units. |
| `segments` | `number` | `8` | Straight pieces the curve is cut into. |
| `thickness` | `number` | `0.04` | Cable thickness, in units. |
| `color` | `color` | `"#141110"` | Cable color. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/cable-sag.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/cable-sag.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add cable-sag</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
