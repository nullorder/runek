---
title: "Vent"
summary: "A louvred wall vent under a small hood. Drawn by the world's shared facade-kit meshes. Decorative: no collider."
category: component
component: vent
order: 100
---

## Add it

```bash
npx @runek/cli add vent
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { Vent } from './runek/Vent'

<Vent position={[0, 0, 0]} width={0.8} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Vent", "props": { "position": [0, 0, 0], "width": 0.8 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Bottom centre of the vent on the wall [x, y, z] in units. |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Rotation [x, y, z] in radians. Turn about Y so local +Z points out of the wall. |
| `seed` | `number` |  | Accepted for the component contract. This component has no seeded variation. |
| `width` | `number` | `0.6` | Width along the wall, in units. |
| `height` | `number` | `0.45` | Height, in units. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/vent.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/vent.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add vent</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
