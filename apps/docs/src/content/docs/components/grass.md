---
title: "Grass"
summary: "Instanced grass blades (seeded scatter)."
category: component
component: grass
order: 100
---

## Add it

```bash
npx @runek/cli add grass
```

Pulls `core`, `@react-three/fiber@^9.6.1`, `three@^0.184.0`.

## Use it

```tsx
import { Grass } from './runek/Grass'

<Grass position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface GrassProps {
  position?: Vec3
  rotation?: Vec3
  /** Patch extent `[width, depth]`, in units. */
  area?: [number, number]
  count?: number
  height?: number
  /** Defaults to the world palette's `foliage` slot. */
  color?: string
  /** Wind sway strength; 0 disables the animation. */
  sway?: number
  seed?: number
}
```

See it live with editable props in the **[gallery →](/gallery/grass)**.
