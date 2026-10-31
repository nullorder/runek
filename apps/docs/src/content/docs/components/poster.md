---
title: "Poster"
summary: "A wall print of seeded flat art (shapes, color bands, a retro sunset, mountain peaks) with an optional caption and a slim or wide frame."
category: component
component: poster
order: 100
---

## Add it

```bash
npx @runek/cli add poster
```

Pulls `sign`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { Poster } from './runek/Poster'

<Poster position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Poster", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `[number, number]` | `[0.5, 0.7]` | The print, [width, height] in units. |
| `art` | `"shapes" \| "bands" \| "sunset" \| "peaks"` |  | Seeded when unset. |
| `frame` | `"none" \| "thin" \| "wide"` |  | Seeded when unset. |
| `title` | `string` |  | A caption printed under the art. |
| `frameColor` | `color` |  | The frame; defaults to the palette's `woodDark`. |
| `paper` | `color` | `"#f4f1ea"` | The paper behind the art and the caption. |
| `ink` | `color` | `"#222222"` | The caption's ink. |
| `texture` | `Texture` (code only) |  | JSX only: a texture the app owns, printed in place of the seeded art. The poster loads nothing itself. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/poster.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/poster.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add poster</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
