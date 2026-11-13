---
title: "RollerShutter"
summary: "A slatted roller shutter in its housing and side guides, rolled up as far as `open` says. Drawn by the world's shared facade-kit meshes. Decorative: no collider."
category: component
component: roller-shutter
order: 100
---

## Add it

```bash
npx @runek/cli add roller-shutter
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { RollerShutter } from './runek/RollerShutter'

<RollerShutter position={[0, 0, 0]} open={0.4} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "RollerShutter", "props": { "position": [0, 0, 0], "open": 0.4 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Bottom centre of the opening on the wall [x, y, z] in units. |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Rotation [x, y, z] in radians. Turn about Y so local +Z points out of the wall. |
| `seed` | `number` |  | Accepted for the component contract. This component has no seeded variation. |
| `width` | `number` | `3.4` | Width of the opening, in units. |
| `height` | `number` | `2.9` | Height of the opening, in units. |
| `open` | `number` | `0` | Share rolled up: 0 is down, 1 is fully open. |
| `color` | `color` | `"#6e6a62"` | Slat color. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/roller-shutter.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/roller-shutter.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add roller-shutter</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
