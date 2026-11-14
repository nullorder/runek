---
title: "NeonSign"
summary: "Words bent out of glass tube on a dark board, at the world's tube luminance level, that flicker: bad tubes buzz and drop out and the whole sign stutters now and then, as a pure function of the world clock and `seed` so every viewer sees the same sign. The tubes are drawn in code from the world's fonts. Decorative: no collider."
category: component
component: neon-sign
order: 100
---

## Add it

```bash
npx @runek/cli add neon-sign
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { NeonSign } from './runek/NeonSign'

<NeonSign position={[0, 0, 0]} text="OPEN LATE" color="#39ff88" flicker={0.6} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "NeonSign", "props": { "position": [0, 0, 0], "text": "OPEN LATE", "color": "#39ff88", "flicker": 0.6, "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | The middle of the sign [x, y, z] in units. It faces local +Z. |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Picks which letters are the bad ones, and when everything stutters. |
| `text` | `string` | `"OPEN"` | The words, on one line. At most 24 characters are drawn. |
| `size` | `number` | `0.5` | Cap height in units. |
| `color` | `color` | `"#ff6418"` | Tube color, lit at the world's `tube` luminance level. |
| `variant` | `"display" \| "body"` | `"display"` | Which of the world's fonts the tubes are bent to. |
| `font` | `string` |  | A font URL to use instead of a world font. |
| `flicker` | `number` | `0.4` | How badly it flickers, 0 (a new sign) to 1 (one that should be taken down). |
| `faults` | `number` | `1` | How many letters have a bad tube of their own. |
| `board` | `boolean` | `true` | Draw the dark board the tubes are mounted on. |
| `light` | `boolean` | `false` | Ask the world's light pool for a real light, which flickers with the sign. |
| `intensity` | `number` | `60` | Candela of that light with every tube lit. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/neon-sign.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/neon-sign.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add neon-sign</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
