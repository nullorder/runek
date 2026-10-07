---
title: "Fountain"
summary: "Two-tier stone fountain with gently rippling water (a per-frame bob, no textures)."
category: component
component: fountain
order: 100
---

## Add it

```bash
npx @runek/cli add fountain
```

Pulls `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`, `three@^0.184.0`.

## Use it

```tsx
import { Fountain } from './runek/Fountain'

<Fountain position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Fountain", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `radius` | `number` | `1.6` | Radius, in units. |
| `color` | `color` | palette `stone` | Stone color; defaults to the world palette's `stone` slot. |
| `waterColor` | `color` | palette `waterShallow` | Water color; defaults to the world palette's `waterShallow` slot. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/fountain.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/fountain.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add fountain</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
