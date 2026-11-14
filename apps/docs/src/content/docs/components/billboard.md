---
title: "Billboard"
summary: "A board that runs ads as data: one or two lines of lettering in the world's display font beside a mark drawn in code that moves with the world clock (steam off a bowl, a watch's hands, a cell filling), cut to the next every `hold` seconds through torn strips. Its picture is redrawn only while near the camera. Lit at the world's screen luminance level. Decorative: no collider."
category: component
component: billboard
order: 100
---

## Add it

```bash
npx @runek/cli add billboard
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { Billboard } from './runek/Billboard'

<Billboard position={[0, 0, 0]} mount="posts" stand={3} hold={6} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Billboard", "props": { "position": [0, 0, 0], "mount": "posts", "stand": 3, "hold": 6, "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | The middle of the lit face [x, y, z] in units. It faces local +Z. |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Shifts which ad is up when, so two boards side by side do not change together. |
| `size` | `[number, number]` | `[7.2, 4.05]` | The lit face, [width, height] in units. |
| `ads` | `BillboardAd[]` | `[{ "lines": ["NIGHT", "NOODLE"], "tagline": "ONE BOWL ALL NIGHT", "mark": "bowl", "background": "#2a120c", "color": "#ffa64d", "accent": "#ff6418" }, { "lines": ["CELL", "CHARGE"], "tagline": "POWER WHEN YOU NEED IT", "mark": "battery", "background": "#1d1f22", "color": "#ece6da", "accent": "#ff8a1f" }, { "lines": ["TIME", "KEEPER"], "tagline": "WATCHES MENDED", "mark": "watch", "background": "#16141c", "color": "#e9e3f5", "accent": "#7a3cff" }, { "lines": ["CLEAR+"], "tagline": "SEE BETTER TONIGHT", "mark": "plus", "background": "#16141c", "color": "#b8c4ff", "accent": "#e9e3f5" }, { "lines": ["CHROME", "WORKS"], "mark": "dial", "background": "#1b1a1f", "color": "#e8e0d4", "accent": "#c47a4e" }, { "lines": ["CITY", "TRANSIT"], "tagline": "EVERY TEN MINUTES", "mark": "clock", "background": "#f4f6fb", "color": "#3d5bff", "accent": "#3d5bff" }, { "lines": ["MIND THE GAP"], "tagline": "PLEASE STAND CLEAR", "mark": "none", "background": "#3d5bff", "color": "#f4f6fb", "accent": "#f4f6fb" }]` | The ads it runs, in order, round and round. Sample ads when unset. |
| `hold` | `number` | `9` | Seconds each ad stays up. |
| `mount` | `"wall" \| "posts"` | `"wall"` | `wall` hangs it on a wall behind it. `posts` stands it on two legs, `stand` units tall. |
| `stand` | `number` | `5` | Height of the legs under a board on posts, in units. |
| `frameColor` | `color` |  | Frame and leg color. Defaults to the world palette's `metal`. |

### `BillboardAd`

| Prop | Type | Default | Description |
|---|---|---|---|
| `lines` | `string[]` | **required** | One or two lines of big lettering. |
| `tagline` | `string` |  | A smaller line under them. |
| `mark` | `"bowl" \| "battery" \| "watch" \| "plus" \| "dial" \| "clock" \| "none"` |  | The mark beside the words. |
| `background` | `string` |  | The board's background. |
| `color` | `color` |  | The first line and the mark. |
| `accent` | `color` |  | The second line, the tagline and the mark's highlights. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/billboard.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/billboard.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add billboard</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
