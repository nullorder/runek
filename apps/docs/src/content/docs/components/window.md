---
title: "Window"
summary: "Window with frame and translucent pane."
category: component
component: window
order: 100
---

## Add it

```bash
npx @runek/cli add window
```

Pulls `core`.

## Use it

```tsx
import { Window } from './runek/Window'

<Window position={[0, 0, 0]} />
```

## Props

```ts
export interface WindowProps {
  position?: Vec3
  rotation?: Vec3
  width?: number
  height?: number
  /** Frame bar thickness, in units. */
  frame?: number
  depth?: number
  color?: string
  glassColor?: string
}
```

See it live with editable props in the **[gallery →](/gallery/window)**.
