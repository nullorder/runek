---
title: "GameConsole"
summary: "A games console (tower, slab, or cube) with up to four controllers laid out in front, to sit under a TV."
category: component
component: gameconsole
order: 100
---

## Add it

```bash
npx @runek/cli add gameconsole
```

Pulls `@runek/core@^0.16.0`.

## Use it

```tsx
import { GameConsole } from './runek/GameConsole'

<GameConsole position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "GameConsole", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `style` | `"tower" \| "slab" \| "cube"` |  | Seeded when unset. |
| `controllers` | `number` |  | Controllers laid out in front of the console, 0 to 4. Seeded (1 or 2) when unset. |
| `color` | `color` |  | Console and controllers. Seeded (black or white) when unset. |
| `accent` | `color` |  | Power light and trim. Seeded when unset. |
| `on` | `boolean` | `true` | Powered on: the light glows. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/gameconsole.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/gameconsole.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add gameconsole</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
