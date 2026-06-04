---
title: "Rug"
summary: "Procedural striped rug (seeded stripes, no textures)."
category: component
component: rug
order: 100
---

## Add it

```bash
npx runek add rug
```

Pulls `core`.

## Use it

```tsx
import { Rug } from './runek/Rug'

<Rug position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface RugProps {
  position?: Vec3
  rotation?: Vec3
  /** `[width, depth]` in units. */
  size?: [number, number]
  baseColor?: string
  borderColor?: string
  accentColor?: string
  seed?: number
}
```

See it live with editable props in the **[gallery →](/gallery/rug)**.
