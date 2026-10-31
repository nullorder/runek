---
title: "Screen"
summary: "A display of any size (a phone, a monitor, a TV, a digital frame, a billboard) on a wall, a stand, a desk foot, or in a frame. Shows a seeded picture or desktop, a text banner, animated static, or a color, or a texture the app hands it."
category: component
component: screen
order: 100
---

## Add it

```bash
npx @runek/cli add screen
```

Pulls `sign`, `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { Screen } from './runek/Screen'

<Screen position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Screen", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `[number, number]` | `[1.6, 0.9]` | The lit area, [width, height] in units: a phone, a TV, a billboard. |
| `mount` | `"stand" \| "wall" \| "desk" \| "frame"` | `"wall"` | Where it hangs or stands; `wall` by default. |
| `content` | `"picture" \| "windows" \| "banner" \| "static" \| "color"` |  | A seeded `picture` (sky, sun, hills) or desktop `windows`, a `banner` of `text`, animated `static`, or a plain `color`. Seeded between picture and windows when unset. |
| `text` | `string` | `"Runek"` | The banner's words. |
| `color` | `color` |  | Background glow, and the tint of the picture and windows. Seeded when unset. |
| `textColor` | `color` | `"#ffffff"` | Banner text color. |
| `on` | `boolean` | `true` | Lit; off, dark glass. |
| `frameColor` | `color` |  | Bezel and stand; defaults to the palette's `metal` (`wood` for a frame). |
| `texture` | `Texture` (code only) |  | JSX only: a texture the app owns (a `VideoTexture`, a `CanvasTexture`, a render target's texture) drawn in place of `content`. The screen loads nothing itself. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/screen.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/screen.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add screen</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
