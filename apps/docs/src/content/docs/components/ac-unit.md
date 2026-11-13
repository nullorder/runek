---
title: "AcUnit"
summary: "An outdoor AC unit on a wall bracket with its drain hose, optionally in a wire cage. Drawn by the world's shared facade-kit meshes, so any number cost no extra draws. Decorative: no collider."
category: component
component: ac-unit
order: 100
---

## Add it

```bash
npx @runek/cli add ac-unit
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { AcUnit } from './runek/AcUnit'

<AcUnit position={[0, 0, 0]} cage={true} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "AcUnit", "props": { "position": [0, 0, 0], "cage": true, "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Where the bracket meets the wall [x, y, z] in units. The unit hangs out along local +Z. |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Rotation [x, y, z] in radians. Turn about Y so local +Z points out of the wall. |
| `seed` | `number` | `1` | Seeds the case tone and the fan's phase. |
| `cage` | `boolean` | `false` | Wrap it in a wire cage. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/ac-unit.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/ac-unit.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add ac-unit</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
