---
title: "Grass"
summary: "Instanced grass blades (seeded scatter)."
category: component
component: grass
order: 100
---

## Add it

```bash
npx runek add grass
```

Pulls `core`, `three@^0.184.0`.

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
  color?: string
  seed?: number
}
```

See it live with editable props in the **[gallery →](/gallery/grass)**.
