---
title: "Room"
summary: "Four walls + floor with a doorway and fixed colliders; optional roof."
category: component
component: room
order: 100
---

## Add it

```bash
npx @runek/cli add room
```

Pulls `core`, `@react-three/rapier@^2.2.0`.

## Use it

```tsx
import { Room } from './runek/Room'

<Room position={[0, 0, 0]} />
```

## Props

```ts
export interface RoomProps {
  position?: Vec3
  /** Interior footprint `[width, depth]`, in units. */
  size?: [number, number]
  height?: number
  thickness?: number
  /** Opening width in the front (+z) wall; set to 0 for a sealed room. */
  doorWidth?: number
  roof?: boolean
  /** Defaults to the world palette's `wall` slot. */
  color?: string
}
```

See it live with editable props in the **[gallery →](/gallery/room)**.
