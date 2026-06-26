---
title: "Terrain"
summary: "Procedural fbm-displaced ground with a matching trimesh collider, a flat build-pad option, and an optional radial island falloff."
category: component
component: terrain
order: 100
---

## Add it

```bash
npx @runek/cli add terrain
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.1`, `three@^0.184.0`.

## Use it

```tsx
import { Terrain } from './runek/Terrain'

<Terrain position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface TerrainProps {
  position?: Vec3
  /** Ground extent `[width, depth]`, in units. */
  size?: [number, number]
  thickness?: number
  /** Defaults to the world palette's `ground` slot. */
  color?: string
  /** Vertical relief amplitude, in units. 0 keeps the ground flat. */
  relief?: number
  /** Grid subdivisions for displaced ground. */
  resolution?: number
  /** Noise frequency. */
  frequency?: number
  /** Radius from center kept flat (for a build pad), in units. */
  flatRadius?: number
  /** Radial island falloff (0 = off). When set, the ground domes up toward the center and
   *  sinks below the world ground at its rim, so the mesh reads as a landmass surrounded by
   *  water. The value is the fraction of the half-extent that stays land before the coast
   *  (e.g. 0.8 = land out to 80% of the radius, then a shoreline into the sea). */
  falloff?: number
  /** Register a collider (default true). Set false for distant/backdrop terrain the player
   *  never walks, to skip a large trimesh collider. */
  collider?: boolean
  seed?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/terrain.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/terrain.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add terrain</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/terrain)**.
