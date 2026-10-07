---
title: "Rug"
summary: "Procedural striped rug (seeded stripes, no textures)."
category: component
component: rug
order: 100
---

## Add it

```bash
npx @runek/cli add rug
```

Pulls `@runek/core@^0.14.0`.

## Use it

```tsx
import { Rug } from './runek/Rug'

<Rug position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Rug", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `size` | `[number, number]` | `[3, 2]` | `[width, depth]` in units. |
| `baseColor` | `color` | palette `fabric` | Defaults to the world palette's `fabric` slot. |
| `borderColor` | `color` | palette `accent` | Defaults to the world palette's `accent` slot. |
| `accentColor` | `color` | `"#9c5252"` |  |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/rug.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/rug.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add rug</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
