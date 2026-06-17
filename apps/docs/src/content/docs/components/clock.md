---
title: "Clock"
summary: "Procedural analog wall clock; hands track the system clock or a given IANA timezone."
category: component
component: clock
order: 100
---

## Add it

```bash
npx runek add clock
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.5.0`, `three@^0.184.0`.

## Use it

```tsx
import { Clock } from './runek/Clock'

<Clock position={[0, 0, 0]} />
```

## Props

```ts
export interface ClockProps {
  position?: Vec3
  rotation?: Vec3
  /** Face radius in units. */
  radius?: number
  /**
   * IANA timezone, e.g. "Asia/Kolkata". Omit to track the local system time;
   * if neither resolves, the clock falls back to UTC.
   */
  timezone?: string
  /** Rim/frame color. Defaults to the world palette's `metal` slot. */
  frameColor?: string
  /** Dial color. */
  faceColor?: string
  /** Hour/minute hand and tick color. */
  handColor?: string
  /** Second hand + hub accent. Defaults to the world palette's `accent` slot. */
  accentColor?: string
}
```

See it live with editable props in the **[gallery →](/gallery/clock)**.
