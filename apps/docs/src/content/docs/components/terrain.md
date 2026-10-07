---
title: "Terrain"
summary: "Procedural fbm-displaced ground with a matching trimesh collider, a flat build-pad option, and an optional radial island falloff. Its surface is queryable (`useGround`, anchors, `runek check-world`)."
category: component
component: terrain
order: 100
---

## Add it

```bash
npx @runek/cli add terrain
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`, `three@^0.184.0`.

## Use it

```tsx
import { Terrain } from './runek/Terrain'

<Terrain position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Terrain", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `size` | `[number, number]` | `[40, 40]` | Ground extent `[width, depth]`, in units. |
| `thickness` | `number` | `0.4` | Thickness, in units. |
| `color` | `color` | palette `ground` | Defaults to the world palette's `ground` slot. |
| `relief` | `number` | `0` | Vertical relief amplitude, in units. 0 keeps the ground flat. |
| `resolution` | `number` | `64` | Grid subdivisions for displaced ground. |
| `frequency` | `number` | `0.04` | Noise frequency. |
| `flatRadius` | `number` | `0` | Radius from center kept flat (for a build pad), in units. |
| `falloff` | `number` | `0` | Radial island falloff (0 = off). When set, the ground domes up toward the center and sinks below the world ground at its rim, so the mesh reads as a landmass surrounded by water. The value is the fraction of the half-extent that stays land before the coast (e.g. 0.8 = land out to 80% of the radius, then a shoreline into the sea). |
| `collider` | `boolean` | `true` | Register a collider (default true). Set false for distant/backdrop terrain the player never walks, to skip a large trimesh collider. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/terrain.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/terrain.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add terrain</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
