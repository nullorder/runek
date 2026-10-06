---
title: "Sign"
summary: "In-world text rendered in a world font (the one font-using component); falls back to the default bundled in @runek/core."
category: component
component: sign
order: 100
---

## Add it

```bash
npx @runek/cli add sign
```

Pulls `@react-three/drei@^10.7.7`, `@runek/core@^0.13.0`.

## Use it

```tsx
import { Sign } from './runek/Sign'

<Sign position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Sign", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `string` | **required** | The text to render. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `variant` | `"display" \| "body"` | `"display"` | Which world font role to render in (`display` for titles/signage, `body` for labels). The world declares the actual face via `<World fonts>`; an undeclared role falls back to the font bundled in `@runek/core`. (Named `variant`, not `role`, so it doesn't trip JSX a11y linters.) |
| `font` | `string` |  | Explicit font URL, overriding the world role. |
| `size` | `number` | `0.3` | Cap height in units. |
| `color` | `color` | palette `accent` | Text color. Defaults to the world palette's `accent` slot. |
| `maxWidth` | `number` |  | Wrap width in units; omit to keep the text on one line. |
| `letterSpacing` | `number` | `0` |  |
| `anchorX` | `"left" \| "center" \| "right"` | `"center"` |  |
| `anchorY` | `"top" \| "bottom" \| "middle"` | `"middle"` |  |
| `glow` | `boolean` | `false` | Soft colored halo around the glyphs, for a glow without bloom. |
| `outline` | `color` |  | A crisp edge in this color, so the text reads against any background. Wins over `glow`. |
| `onBounds` | `function` (code only) |  | Called with the laid-out text's width and height, in world units, whenever it changes: for fitting a backdrop behind it. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/sign.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/sign.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add sign</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
