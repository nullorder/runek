---
title: "Chair"
summary: "Chair with seat, back, and legs."
category: component
component: chair
order: 100
---

## Add it

```bash
npx runek add chair
```

Pulls `core`, `@react-three/rapier@^2.2.0`.

## Use it

```tsx
import { Chair } from './runek/Chair'

<Chair position={[0, 0, 0]} />
```

## Props

```ts
export interface ChairProps {
  position?: Vec3
  rotation?: Vec3
  width?: number
  depth?: number
  seatHeight?: number
  backHeight?: number
  color?: string
}
```

See it live with editable props in the **[gallery →](/gallery/chair)**.
