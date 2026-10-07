---
title: "Counter"
summary: "A service / bar counter: a solid body under a worktop that overhangs the front; one cuboid collider. With hob, a kitchen stove: a glass cooktop and an oven door."
category: component
component: counter
order: 100
---

## Add it

```bash
npx @runek/cli add counter
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`.

## Use it

```tsx
import { Counter } from './runek/Counter'

<Counter position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Counter", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `length` | `number` | `3` | Length along local X, in units. |
| `height` | `number` | `1.1` | Counter height, in units. |
| `depth` | `number` | `0.6` | Depth along local Z, in units. |
| `color` | `color` |  | Body color; defaults to the palette's `wood`. |
| `topColor` | `color` |  | Worktop color; defaults to the palette's `woodDark`. |
| `hob` | `boolean` | `false` | A kitchen stove at the +X end: a glass hob with four burners on the worktop and an oven door in the front below it. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/counter.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/counter.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add counter</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
