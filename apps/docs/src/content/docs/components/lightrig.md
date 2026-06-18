---
title: "LightRig"
summary: "Sun + hemisphere/ground fill with shadow configuration."
category: component
component: lightrig
order: 100
---

## Add it

```bash
npx @runek/cli add lightrig
```

Pulls `core`.

## Use it

```tsx
import { LightRig } from './runek/LightRig'

<LightRig position={[0, 0, 0]} />
```

## Props

```ts
export interface LightRigProps {
  sunPosition?: Vec3
  sunColor?: string
  sunIntensity?: number
  ambient?: number
  skyColor?: string
  groundColor?: string
  shadows?: boolean
  /** Half-extent of the shadow camera frustum, in units. */
  shadowRange?: number
}
```

See it live with editable props in the **[gallery →](/gallery/lightrig)**.
