---
title: "Room"
summary: "Four walls + floor with a doorway and fixed colliders; optional roof."
category: component
component: room
order: 100
---

## Add it

```bash
npx @runek/cli add room
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.1`.

## Use it

```tsx
import { Room } from './runek/Room'

<Room position={[0, 0, 0]} />
```

## Props

```ts
export interface RoomProps {
  position?: Vec3
  /** Interior footprint `[width, depth]`, in units. */
  size?: [number, number]
  height?: number
  thickness?: number
  /** Opening width in the front (+z) wall; set to 0 for a sealed room. */
  doorWidth?: number
  roof?: boolean
  /** Defaults to the world palette's `wall` slot. */
  color?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/room.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/room.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add room</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/room)**.
