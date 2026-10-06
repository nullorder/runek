---
title: "Well"
summary: "Stone well with a dark pool, posts, a little pyramid roof, and a bucket on a rope."
category: component
component: well
order: 100
---

## Add it

```bash
npx @runek/cli add well
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`.

## Use it

```tsx
import { Well } from './runek/Well'

<Well position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Well", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `radius` | `number` | `0.7` | Radius, in units. |
| `wallHeight` | `number` | `0.8` |  |
| `color` | `color` | palette `stone` | Stone color; defaults to the world palette's `stone` slot. |
| `roofColor` | `color` | palette `wood` | Roof + frame color; defaults to the world palette's `wood` slot. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/well.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/well.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add well</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
