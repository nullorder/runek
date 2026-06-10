---
title: "Terrain"
summary: "Procedural fbm-displaced ground with a matching trimesh collider and a flat build-pad option."
category: component
component: terrain
order: 100
---

## Add it

```bash
npx runek add terrain
```

Pulls `core`, `@react-three/rapier@^2.2.0`, `three@^0.184.0`.

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
  seed?: number
}
```

See it live with editable props in the **[gallery →](/gallery/terrain)**.
