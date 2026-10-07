---
title: "Pool"
summary: "A built swimming pool flush with the deck: coping rim, walkable plastered basin with corner exit steps, and a translucent water surface."
category: component
component: pool
order: 100
---

## Add it

```bash
npx @runek/cli add pool
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`.

## Use it

```tsx
import { Pool } from './runek/Pool'

<Pool position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Pool", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `[number, number]` | `[6, 3.5]` | Water surface `[width, depth]`, in units. |
| `depth` | `number` | `1.6` | Basin depth below the deck, in units. |
| `coping` | `number` | `0.35` | Coping ledge width around the rim, in units. |
| `steps` | `boolean` | `true` | Build exit steps into one corner of the basin. |
| `copingColor` | `color` | palette `wall` | Coping color; defaults to the world palette's `wall` slot. |
| `basinColor` | `color` | `"#bfe0e6"` | Basin plaster color. |
| `waterColor` | `color` | palette `waterShallow` | Defaults to the world palette's `waterShallow` slot. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/pool.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/pool.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add pool</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
