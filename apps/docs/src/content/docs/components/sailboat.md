---
title: "Sailboat"
summary: "A small procedural sailboat: a station-built low-poly hull, mast, boom, and mainsail, floating at the waterline with a gentle moored bob."
category: component
component: sailboat
order: 100
---

## Add it

```bash
npx @runek/cli add sailboat
```

Pulls `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`, `three@^0.184.0`.

## Use it

```tsx
import { Sailboat } from './runek/Sailboat'

<Sailboat position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Sailboat", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `length` | `number` | `5.5` | Hull length along local Z (bow at +Z), in units. |
| `beam` | `number` | `2` | Hull maximum beam (width along X), in units. |
| `freeboard` | `number` | `0.5` | Deck height above the waterline (local y=0), in units. |
| `draft` | `number` | `0.6` | Keel depth below the waterline, in units. |
| `mastHeight` | `number` | `4.6` | Mast height above the deck, in units. |
| `boomLength` | `number` | `3.2` | Boom length aft of the mast, in units. |
| `sail` | `boolean` | `true` | Raise the mainsail. |
| `bob` | `boolean` | `true` | Gentle moored bobbing on the swell. |
| `collider` | `boolean` | `true` | Solid hull collider. |
| `physics` | `boolean` | `true` | Render the hull/rig as a bare visual, with no `RigidBody` or collider — for a parent controller (e.g. a steerable vehicle) that owns the physics body. When false, `position` and `rotation` place the visual directly and the `collider` prop is ignored. Default true. |
| `color` | `color` |  | Hull color; defaults to the world palette's `wood`. |
| `trimColor` | `color` |  | Deck, mast, and boom color; defaults to the palette's `woodDark`. |
| `sailColor` | `color` | `"#eee6d0"` | Sail color. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/sailboat.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/sailboat.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add sailboat</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
