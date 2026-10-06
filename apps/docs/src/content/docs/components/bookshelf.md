---
title: "Bookshelf"
summary: "Procedurally generated bookshelf with seeded books and one cuboid collider."
category: component
component: bookshelf
order: 100
---

## Add it

```bash
npx @runek/cli add bookshelf
```

Pulls `sign`, `@react-three/drei@^10.7.7`, `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Bookshelf } from './runek/Bookshelf'

<Bookshelf position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Bookshelf", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `width` | `number` | `1.2` | Outer dimensions in units. |
| `height` | `number` | `2` | Height, in units. |
| `depth` | `number` | `0.3` | Depth, in units. |
| `shelves` | `number` | `3` | Number of rows. Defaults to 3; set 1 or 2 for a shorter case. |
| `fill` | `number` | `0` | Fraction of shelf space filled with procedural decoration, 0–1. Defaults to `0` (an empty shelf); set it for a decorative, non-interactive shelf. Ignored when `books` is set. |
| `color` | `color` | palette `wood` | Frame color. Defaults to the world palette's `wood` slot. |
| `backColor` | `color` | palette `woodDark` | Back-panel color. Defaults to the world palette's `woodDark` slot. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |
| `books` | `BookSpec[]` |  | Explicit, addressable books. When provided, these replace the procedural `fill` and are the only books rendered. Pass `[]` for an empty shelf and append to make books appear. A book is clickable when `onBookSelect` is set or it carries an `href`. |
| `onBookSelect` | `function` (code only) |  | Called with the clicked book. When omitted, a book's `href` is navigated to. |
| `label` | `string` |  | Section label rendered above the shelf, e.g. `"Guides"`. Drawn as a `Sign` in the world's `display` face. |
| `labelColor` | `color` | palette `accent` | Label color. Defaults to the world palette's `accent` slot. |
| `labelSize` | `number` | `0.08` | Label cap height in units. |

### `BookSpec`

| Prop | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | **required** | Stable identity, passed back to `onBookSelect`. |
| `title` | `string` |  | Shown as a hover label. |
| `color` | `color` |  | Spine color. Defaults to a seeded color. |
| `href` | `string` |  | Navigated to on click when no `onBookSelect` is given. |
| `shelf` | `number` |  | Row to place the book on, counted from the top (0 = top row). Clamped to the shelf's row count. Books without a row auto-pack bottom-up around the placed ones. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/bookshelf.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/bookshelf.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add bookshelf</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
