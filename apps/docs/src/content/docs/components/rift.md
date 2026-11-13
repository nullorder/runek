---
title: "Rift"
summary: "A pair of linked rifts torn in the air, ragged and edged in iridescent, glitter-shedding light. Each shows the other end live and in parallax, and walking into either carries you to the other: walkable shortcuts within one world (use Portal for other worlds or pages)."
category: component
component: rift
order: 100
---

## Add it

```bash
npx @runek/cli add rift
```

Pulls `sign`, `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { Rift } from './runek/Rift'

<Rift position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Rift", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `destination` | `[x, y, z]` |  | Where the other end stands (the foot of its rift), in world coordinates. Each end shows the other live through its opening, and walking into either carries you to the other. Default: 8 units behind `position`. |
| `destinationRotation` | `[x, y, z]` |  | Euler rotation of the far end, in radians: which way its caption faces. Default `rotation`. |
| `label` | `string` |  | Floating caption above the rift at `position` (e.g. the name of where it leads). |
| `returnLabel` | `string` |  | Floating caption above the rift at `destination`. |
| `radius` | `number` | `1.5` | Radius of each opening, in units. The ragged edge breathes around it. |
| `color` | `color` |  | Tint for the rims and glitter. Unset, the rims are an iridescent pink, violet and cyan film. |
| `active` | `boolean` | `true` | Open both rifts and let them carry travelers. When false they shrink to small shimmering bubbles and stay inert; flipping it to true tears them open. Default true. |
| `onTravel` | `function` (code only) |  | Called after a traveler is carried through, with the foot of the end they came out of. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/rift.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/rift.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add rift</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
