---
title: "Road"
summary: "A paved street: a flat stone deck with low kerbs, draped on the ground like Path; decorative (no collider)."
category: component
component: road
order: 100
---

## Add it

```bash
npx @runek/cli add road
```

Pulls `@runek/core@^0.13.0`.

## Use it

```tsx
import { Road } from './runek/Road'

<Road position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Road", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `length` | `number` | `12` | Length along local Z, in units. |
| `width` | `number` | `3` | Width along local X, in units. |
| `color` | `color` |  | Deck color; defaults to the palette's `stone`. |
| `kerbColor` | `color` |  | Kerb color; defaults to the palette's `woodDark`. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/road.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/road.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add road</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
