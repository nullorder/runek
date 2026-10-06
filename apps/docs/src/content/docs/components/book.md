---
title: "Book"
summary: "A single procedural book — standing, lying, or open — with a seeded cover and optional click interaction; the standalone sibling of Bookshelf's instanced spines."
category: component
component: book
order: 100
---

## Add it

```bash
npx @runek/cli add book
```

Pulls `@react-three/drei@^10.7.7`, `@runek/core@^0.13.0`.

## Use it

```tsx
import { Book } from './runek/Book'

<Book position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Book", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `width` | `number` | `0.22` | Cover width (spine to fore-edge), in units. |
| `height` | `number` | `0.3` | Spine length, in units. |
| `thickness` | `number` | `0.05` | Closed page-block thickness, in units. |
| `pose` | `"standing" \| "lying" \| "open"` | `"lying"` | `lying` rests on its back cover (spine on the -x edge); `standing` stands upright on its bottom edge; `open` lies opened flat at the spine. |
| `color` | `color` |  | Cover color. Defaults to a seeded cloth-bound color. |
| `pageColor` | `color` | `"#efe7d2"` |  |
| `title` | `string` |  | Shown as a hover label when the book is interactive. |
| `href` | `string` |  | Navigated to on click when no `onSelect` is given. |
| `onSelect` | `function` (code only) |  | Called on click. Optional, so the book still renders from data. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/book.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/book.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add book</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
