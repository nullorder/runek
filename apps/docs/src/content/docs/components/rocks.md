---
title: "Rocks"
summary: "Faceted rocks with convex-hull colliders (seeded scatter)."
category: component
component: rocks
order: 100
---

## Add it

```bash
npx @runek/cli add rocks
```

Pulls `core`, `@react-three/rapier@^2.2.0`.

## Use it

```tsx
import { Rocks } from './runek/Rocks'

<Rocks position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface RocksProps {
  position?: Vec3
  rotation?: Vec3
  count?: number
  /** Cluster radius, in units. */
  spread?: number
  /** Mean rock radius, in units. */
  size?: number
  hue?: number
  seed?: number
}
```

See it live with editable props in the **[gallery →](/gallery/rocks)**.
