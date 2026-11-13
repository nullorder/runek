---
title: "CoffeeGear"
summary: "What a cafe makes coffee with and shows off: an espresso machine, grinder, pour-over bar, siphon, cold drip tower, batch brewer, taps, a drum roaster, and beans in bags, jars and stocked shelves, one `kind` to a node. Only the roaster has a collider."
category: component
component: coffee-gear
order: 100
---

## Add it

```bash
npx @runek/cli add coffee-gear
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { CoffeeGear } from './runek/CoffeeGear'

<CoffeeGear position={[0, 0, 0]} kind="pourover" length={0.9} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "CoffeeGear", "props": { "position": [0, 0, 0], "kind": "pourover", "length": 0.9, "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` |  | The middle of its foot: on the counter it stands on. A shelf's is the middle of its lowest board. |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | The working side is the kind's own +Z. |
| `seed` | `number` | `0` | Picks the bag colors and how high each stack of cups is. |
| `kind` | `"espresso" \| "grinder" \| "pourover" \| "chemex" \| "press" \| "moka" \| "siphon" \| "coldbrew" \| "kettle" \| "batch" \| "ibrik" \| "taps" \| "pitchers" \| "jars" \| "bags" \| "cups" \| "shelf" \| "roaster"` | `"espresso"` | Which piece of gear it is. |
| `length` | `number` | `0.6` | How long a row is, or how wide an espresso machine, in units. |
| `rows` | `number` | `3` | How many boards a shelf has. |
| `glow` | `color` | `"#ffa64d"` | The color of its pilot lights and flames, lit at the world's `screen` luminance level. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/coffee-gear.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/coffee-gear.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add coffee-gear</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
