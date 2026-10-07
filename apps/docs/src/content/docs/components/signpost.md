---
title: "Signpost"
summary: "A wooden post-and-plank signboard carrying a name in the world's display font; the post sits behind the board so the text reads clean."
category: component
component: signpost
order: 100
---

## Add it

```bash
npx @runek/cli add signpost
```

Pulls `sign`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`.

## Use it

```tsx
import { Signpost } from './runek/Signpost'

<Signpost position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Signpost", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | `""` | The name shown on the board. A plain string, **not** `children`: a world renderer overrides a node's `children` prop with its nested nodes, so text authored in JSON must be a named prop to survive. Empty by default — `<Signpost />` is a blank board. |
| `height` | `number` | `2.6` | Post height, in units. |
| `width` | `number` | `3.4` | Board width, in units. |
| `color` | `color` |  | Post + board wood color; defaults to the palette's `wood`. |
| `textColor` | `color` |  | Name color; defaults to the palette's `sand` (legible on the wood). |
| `size` | `number` | `0.5` | Name cap height, in units. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/signpost.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/signpost.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add signpost</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
