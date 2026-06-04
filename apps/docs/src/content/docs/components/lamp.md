---
title: "Lamp"
summary: "Lamp that emits a point light."
category: component
component: lamp
order: 100
---

## Add it

```bash
npx runek add lamp
```

Pulls `core`, `@react-three/rapier@^2.2.0`.

## Use it

```tsx
import { Lamp } from './runek/Lamp'

<Lamp position={[0, 0, 0]} />
```

## Props

```ts
export interface LampProps {
  position?: Vec3
  rotation?: Vec3
  height?: number
  color?: string
  shadeColor?: string
  lightColor?: string
  intensity?: number
}
```

See it live with editable props in the **[gallery →](/gallery/lamp)**.
