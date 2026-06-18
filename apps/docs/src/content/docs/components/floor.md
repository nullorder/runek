---
title: "Floor"
summary: "Flat floor slab with a fixed collider."
category: component
component: floor
order: 100
---

## Add it

```bash
npx @runek/cli add floor
```

Pulls `core`, `@react-three/rapier@^2.2.0`.

## Use it

```tsx
import { Floor } from './runek/Floor'

<Floor position={[0, 0, 0]} />
```

## Props

```ts
export interface FloorProps {
  position?: Vec3
  rotation?: Vec3
  /** `[width, depth]` in units. The top surface sits at the component origin. */
  size?: [number, number]
  thickness?: number
  /** Defaults to the world palette's `floor` slot. */
  color?: string
}
```

See it live with editable props in the **[gallery →](/gallery/floor)**.
