---
title: "Barrel"
summary: "Staved barrel bellied at the middle, banded by metal hoops; convex-hull collider."
category: component
component: barrel
order: 100
---

## Add it

```bash
npx @runek/cli add barrel
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`.

## Use it

```tsx
import { Barrel } from './runek/Barrel'

<Barrel position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Barrel", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `radius` | `number` | `0.35` | Radius, in units. |
| `height` | `number` | `0.9` | Height, in units. |
| `color` | `color` | palette `wood` | Stave color; defaults to the world palette's `wood` slot. |
| `hoopColor` | `color` | palette `metal` | Hoop color; defaults to the world palette's `metal` slot. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/barrel.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/barrel.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add barrel</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
