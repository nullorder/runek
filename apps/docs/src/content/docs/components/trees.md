---
title: "Trees"
summary: "L-system trees grown by a 3D turtle, deterministic from seed."
category: component
component: trees
order: 100
---

## Add it

```bash
npx runek add trees
```

Pulls `core`, `@react-three/rapier@^2.2.0`, `three@^0.184.0`.

## Use it

```tsx
import { Trees } from './runek/Trees'

<Trees position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface TreesProps {
  position?: Vec3
  rotation?: Vec3
  seed?: number
  iterations?: number
  /** Base branch length, in units. */
  segmentLength?: number
  /** Branching angle, in radians. */
  angle?: number
  /** Defaults to the world palette's `bark` slot. */
  trunkColor?: string
  /** Defaults to the world palette's `foliage` slot. */
  leafColor?: string
}
```

See it live with editable props in the **[gallery →](/gallery/trees)**.
