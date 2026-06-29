---
title: "Clock"
summary: "Procedural analog wall clock; hands track the system clock or a given IANA timezone."
category: component
component: clock
order: 100
---

## Add it

```bash
npx @runek/cli add clock
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.10.4`, `three@^0.184.0`.

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
   * IANA timezone, e.g. "Asia/Kolkata". Omit to inherit the world's `timezone`
   * (`<World timezone>`), then the local system time; if neither resolves, the
   * clock falls back to UTC.
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

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/clock.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/clock.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add clock</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
