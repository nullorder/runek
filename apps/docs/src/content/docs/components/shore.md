---
title: "Shore"
summary: "Sloped beach/shore strip to meet a Lake."
category: component
component: shore
order: 100
---

## Add it

```bash
npx @runek/cli add shore
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`.

## Use it

```tsx
import { Shore } from './runek/Shore'

<Shore position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Shore", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `size` | `[number, number]` | `[24, 24]` | `[width, depth]` in units. The sandy top sits at the component origin. |
| `thickness` | `number` | `0.3` | Thickness, in units. |
| `color` | `color` | palette `sand` | Defaults to the world palette's `sand` slot. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/shore.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/shore.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add shore</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
