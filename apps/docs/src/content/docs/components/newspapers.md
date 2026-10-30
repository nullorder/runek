---
title: "Newspapers"
summary: "The day's papers on a table: a pile of folded newspapers with headlines, photos and columns, and magazines fanned beside it, as one instanced mesh. Seeded covers. Decorative."
category: component
component: newspapers
order: 100
---

## Add it

```bash
npx @runek/cli add newspapers
```

Pulls `@runek/core@^0.16.0`, `three@^0.184.0`.

## Use it

```tsx
import { Newspapers } from './runek/Newspapers'

<Newspapers position={[0, 0, 0]} papers={2} magazines={3} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Newspapers", "props": { "position": [0, 0, 0], "papers": 2, "magazines": 3, "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `papers` | `number` | `2` | Folded newspapers in the pile, 0 to 4. |
| `magazines` | `number` | `2` | Magazines fanned beside it, 0 to 4. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/newspapers.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/newspapers.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add newspapers</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
