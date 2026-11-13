---
title: "PipeRun"
summary: "A pipe or conduit run clipped to a wall, up it or along it, with a collar every couple of metres. Drawn by the world's shared facade-kit meshes. Decorative: no collider."
category: component
component: pipe-run
order: 100
---

## Add it

```bash
npx @runek/cli add pipe-run
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { PipeRun } from './runek/PipeRun'

<PipeRun position={[0, 0, 0]} length={4} radius={0.05} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "PipeRun", "props": { "position": [0, 0, 0], "length": 4, "radius": 0.05 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Where the run starts on the wall [x, y, z] in units. It climbs along local +Y, or runs along local +X when `horizontal`. |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Rotation [x, y, z] in radians. Turn about Y so local +Z points out of the wall. |
| `seed` | `number` |  | Accepted for the component contract. This component has no seeded variation. |
| `length` | `number` | `6` | Length of the run, in units. |
| `horizontal` | `boolean` | `false` | Run along the wall instead of up it. |
| `radius` | `number` | `0.06` | Pipe radius, in units. |
| `color` | `color` | `"#4a4844"` | Pipe color. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/pipe-run.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/pipe-run.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add pipe-run</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
