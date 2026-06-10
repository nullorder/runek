---
title: "Lake"
summary: "Procedural animated-shader water surface (no textures)."
category: component
component: lake
order: 100
---

## Add it

```bash
npx runek add lake
```

Pulls `core`, `@react-three/fiber@^9.6.1`, `three@^0.184.0`.

## Use it

```tsx
import { Lake } from './runek/Lake'

<Lake position={[0, 0, 0]} />
```

## Props

```ts
export interface LakeProps {
  position?: Vec3
  rotation?: Vec3
  /** Water surface `[width, depth]`, in units. */
  size?: [number, number]
  /** Defaults to the world palette's `waterDeep` slot. */
  colorDeep?: string
  /** Defaults to the world palette's `waterShallow` slot. */
  colorShallow?: string
  /** Direction the sun glint comes from; pair with your Sky's `sunPosition`. */
  sunPosition?: Vec3
  waveHeight?: number
  waveSpeed?: number
  segments?: number
}
```

See it live with editable props in the **[gallery →](/gallery/lake)**.
