---
title: "Lake"
summary: "Procedural animated-shader water surface (no textures); place its surface at or below ground level."
category: component
component: lake
order: 100
---

## Add it

```bash
npx @runek/cli add lake
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Lake } from './runek/Lake'

<Lake position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Lake", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` |  | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `size` | `[number, number]` | `[20, 20]` | Water surface `[width, depth]`, in units. |
| `colorDeep` | `color` | palette `waterDeep` | Defaults to the world palette's `waterDeep` slot. |
| `colorShallow` | `color` | palette `waterShallow` | Defaults to the world palette's `waterShallow` slot. |
| `sunPosition` | `[x, y, z]` | `[80, 30, 40]` | Direction the sun glint comes from; pair with your Sky's `sunPosition`. |
| `waveHeight` | `number` | `0.12` |  |
| `waveSpeed` | `number` | `1` |  |
| `segments` | `number` | `64` |  |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/lake.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/lake.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add lake</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
