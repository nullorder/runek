---
title: "Player"
summary: "First/third-person character controller (ecctrl wrapper)."
category: component
component: player
order: 100
---

## Add it

```bash
npx @runek/cli add player
```

Pulls `core`, `ecctrl@^1.0.97`.

## Use it

```tsx
import { Player } from './runek/Player'

<Player position={[0, 0, 0]} />
```

## Props

```ts
export interface PlayerProps {
  position?: Vec3
  view?: PlayerView
  /** Initial camera yaw in radians (0 faces +z). */
  yaw?: number
}
```

See it live with editable props in the **[gallery →](/gallery/player)**.
