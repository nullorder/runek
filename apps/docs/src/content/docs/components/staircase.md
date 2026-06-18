---
title: "Staircase"
summary: "Stepped staircase with per-step colliders."
category: component
component: staircase
order: 100
---

## Add it

```bash
npx @runek/cli add staircase
```

Pulls `core`, `@react-three/rapier@^2.2.0`.

## Use it

```tsx
import { Staircase } from './runek/Staircase'

<Staircase position={[0, 0, 0]} />
```

## Props

```ts
export interface StaircaseProps {
  position?: Vec3
  rotation?: Vec3
  steps?: number
  /** Total rise, in units. Ascends along +y and +z from the origin. */
  totalHeight?: number
  width?: number
  /** Total run (depth), in units. */
  depth?: number
  /** Defaults to the world palette's `stone` slot. */
  color?: string
}
```

See it live with editable props in the **[gallery →](/gallery/staircase)**.
