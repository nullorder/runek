---
title: "Door"
summary: "Door panel within a frame."
category: component
component: door
order: 100
---

## Add it

```bash
npx @runek/cli add door
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.1`.

## Use it

```tsx
import { Door } from './runek/Door'

<Door position={[0, 0, 0]} />
```

## Props

```ts
export interface DoorProps {
  position?: Vec3
  rotation?: Vec3
  width?: number
  height?: number
  thickness?: number
  /** Hinge angle in radians; 0 is closed. */
  openAngle?: number
  /** Defaults to the world palette's `wood` slot. */
  color?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/door.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/door.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add door</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/door)**.
