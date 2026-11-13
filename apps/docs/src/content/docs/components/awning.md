---
title: "Awning"
summary: "A sloped fabric shop awning with a striped valance and two arms, hung from a wall. Drawn by the world's shared facade-kit meshes. Decorative: no collider."
category: component
component: awning
order: 100
---

## Add it

```bash
npx @runek/cli add awning
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { Awning } from './runek/Awning'

<Awning position={[0, 0, 0]} width={3} color="#2f3a2c" />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Awning", "props": { "position": [0, 0, 0], "width": 3, "color": "#2f3a2c" } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Middle of the top edge, where it meets the wall [x, y, z] in units. |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Rotation [x, y, z] in radians. Turn about Y so local +Z points out of the wall. |
| `seed` | `number` |  | Accepted for the component contract. This component has no seeded variation. |
| `width` | `number` | `3.4` | Width along the wall, in units. |
| `depth` | `number` | `1.3` | How far it reaches over the pavement, in units. |
| `drop` | `number` | `0.45` | How far the outer edge hangs below the wall edge, in units. |
| `color` | `color` | `"#5a2a1c"` | Fabric color. |
| `stripes` | `boolean` | `true` | Paint the fabric in two-tone stripes. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/awning.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/awning.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add awning</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
