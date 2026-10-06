---
title: "Ocean"
summary: "Camera-following animated-shader ocean that reaches the world fog horizon (no textures); sits at the world ground."
category: component
component: ocean
order: 100
---

## Add it

```bash
npx @runek/cli add ocean
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Ocean } from './runek/Ocean'

<Ocean position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Ocean", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` |  | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `size` | `[number, number]` | `[400, 400]` | Plane size `[width, depth]`, in units. With `follow` on (the default) this patch tracks the camera, so keep it large enough to reach past the world fog. |
| `colorDeep` | `color` | palette `waterDeep` | Defaults to the world palette's `waterDeep` slot. |
| `colorShallow` | `color` | palette `waterShallow` | Defaults to the world palette's `waterShallow` slot. |
| `sunPosition` | `[x, y, z]` | `[80, 30, 40]` | Direction the sun glint comes from; pair with your Sky's `sunPosition`. |
| `waveHeight` | `number` | `0.4` |  |
| `waveSpeed` | `number` | `0.6` |  |
| `segments` | `number` | `160` |  |
| `follow` | `boolean` | `true` | Track the camera horizontally for an endless sea (default true). Set false to pin it. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/ocean.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/ocean.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add ocean</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
