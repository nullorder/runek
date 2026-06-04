---
title: "Sky"
summary: "Procedural atmosphere (drei Sky)."
category: component
component: sky
order: 100
---

## Add it

```bash
npx runek add sky
```

Pulls `core`, `@react-three/drei@^10.7.7`.

## Use it

```tsx
import { Sky } from './runek/Sky'

<Sky position={[0, 0, 0]} />
```

## Props

```ts
export interface SkyProps {
  /** Direction of the sun; also where the bright spot appears. */
  sunPosition?: Vec3
  turbidity?: number
  rayleigh?: number
}
```

See it live with editable props in the **[gallery →](/gallery/sky)**.
