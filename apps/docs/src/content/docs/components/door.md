---
title: "Door"
summary: "Door panel within a frame."
category: component
component: door
order: 100
---

## Add it

```bash
npx runek add door
```

Pulls `core`, `@react-three/rapier@^2.2.0`.

## Use it

```tsx
import { Door } from './runek/Door'

<Door position={[0, 0, 0]} />
```

## Props

```ts
export interface DoorProps {
  position?: Vec3
  rotation?: Vec3
  width?: number
  height?: number
  thickness?: number
  /** Hinge angle in radians; 0 is closed. */
  openAngle?: number
  /** Defaults to the world palette's `wood` slot. */
  color?: string
}
```

See it live with editable props in the **[gallery →](/gallery/door)**.
