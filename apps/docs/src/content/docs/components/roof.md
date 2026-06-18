---
title: "Roof"
summary: "Flat or gable roof."
category: component
component: roof
order: 100
---

## Add it

```bash
npx @runek/cli add roof
```

Pulls `core`, `@react-three/rapier@^2.2.0`.

## Use it

```tsx
import { Roof } from './runek/Roof'

<Roof position={[0, 0, 0]} />
```

## Props

```ts
export interface RoofProps {
  position?: Vec3
  rotation?: Vec3
  /** `[width, depth]` in units. The roof rests with its base at the component origin. */
  size?: [number, number]
  style?: RoofStyle
  /** Ridge height for a gable roof, in units. */
  peak?: number
  thickness?: number
  overhang?: number
  /** Defaults to the world palette's `roof` slot. */
  color?: string
}
```

See it live with editable props in the **[gallery →](/gallery/roof)**.
