---
title: "Window"
summary: "Window with frame and translucent pane."
category: component
component: window
order: 100
---

## Add it

```bash
npx @runek/cli add window
```

Pulls `@runek/core@^0.14.0`.

## Use it

```tsx
import { Window } from './runek/Window'

<Window position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Window", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `width` | `number` | `1.2` | Width, in units. |
| `height` | `number` | `1.2` | Height, in units. |
| `frame` | `number` | `0.08` | Frame bar thickness, in units. |
| `depth` | `number` | `0.1` | Depth, in units. |
| `color` | `color` | `"#e8e2d6"` |  |
| `glassColor` | `color` | `"#acd4e6"` |  |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/window.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/window.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add window</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
