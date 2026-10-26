---
title: "Tableware"
summary: "Tableware to set a table: a plate, bowl, glass, cup, or water jug turned from a profile, or a whole place setting. Drinks fill to a line; plates and bowls stack."
category: component
component: tableware
order: 100
---

## Add it

```bash
npx @runek/cli add tableware
```

Pulls `@runek/core@^0.16.0`, `three@^0.184.0`.

## Use it

```tsx
import { Tableware } from './runek/Tableware'

<Tableware position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Tableware", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `kind` | `"glass" \| "plate" \| "bowl" \| "cup" \| "jug" \| "setting"` | `"plate"` | Which piece; a plate by default. |
| `size` | `number` | `1` | Scale on the piece's true size (a 26 cm plate, an 11 cm glass, a 23 cm jug). |
| `stack` | `number` | `1` | Plates or bowls stacked on each other. |
| `fill` | `number` |  | How full a glass, cup, or jug is, 0 to 1. Seeded when unset. |
| `drinkColor` | `color` | `"#9fd3e8"` | The drink: water by default. |
| `color` | `color` |  | Glaze for plates, bowls, and cups. Seeded (mostly white) when unset. |
| `glassColor` | `color` | `"#d8eef6"` | Glass for glasses and the jug. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/tableware.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/tableware.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add tableware</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
