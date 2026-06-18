---
title: "Wall"
summary: "Wall segment with door/window openings and a fixed collider."
category: component
component: wall
order: 100
---

## Add it

```bash
npx @runek/cli add wall
```

Pulls `core`, `@react-three/rapier@^2.2.0`.

## Use it

```tsx
import { Wall } from './runek/Wall'

<Wall position={[0, 0, 0]} />
```

## Props

```ts
export interface WallProps {
  position?: Vec3
  rotation?: Vec3
  /** Length along the wall's local X axis, in units. */
  width?: number
  height?: number
  thickness?: number
  /** Defaults to the world palette's `wall` slot. */
  color?: string
  opening?: WallOpening
}
```

See it live with editable props in the **[gallery →](/gallery/wall)**.
