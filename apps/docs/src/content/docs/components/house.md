---
title: "House"
summary: "Composed dwelling: walls with openings, floor, roof, door, and windows."
category: component
component: house
order: 100
---

## Add it

```bash
npx runek add house
```

Pulls `core`, `door`, `floor`, `roof`, `wall`, `window`.

## Use it

```tsx
import { House } from './runek/House'

<House position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface HouseProps {
  position?: Vec3
  rotation?: Vec3
  /** Interior footprint `[width, depth]`, in units. */
  size?: [number, number]
  height?: number
  thickness?: number
  roofStyle?: RoofStyle
  /** Defaults to the world palette's `wall` slot. */
  wallColor?: string
  /** Defaults to the world palette's `roof` slot. */
  roofColor?: string
  /** Reserved for procedural variation. */
  seed?: number
}
```

See it live with editable props in the **[gallery →](/gallery/house)**.
