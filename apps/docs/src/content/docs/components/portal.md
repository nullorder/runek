---
title: "Portal"
summary: "A travel gate: a glowing sensor ring that fires onEnter (or navigates to a destination) when the avatar or a vehicle passes through — for world-to-world travel, level transitions, and teleports."
category: component
component: portal
order: 100
---

## Add it

```bash
npx @runek/cli add portal
```

Pulls `sign`, `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Portal } from './runek/Portal'

<Portal position={[0, 0, 0]} />
```

## Props

```ts
export interface PortalProps extends WorldComponentProps {
  /**
   * Where the portal leads — a URL or app route. Kept JSON-serializable so a world
   * round-trips from data. With no `onEnter`, entering navigates here
   * (`window.location.href = to`); with `onEnter`, this is just passed through to it.
   */
  to?: string
  /**
   * Called once when the avatar (or a vehicle) enters the gate, with `to`. Optional, so
   * the component still renders and round-trips from data without it (CONTRACT §1). Use it
   * to drive an in-app transition instead of a full navigation — e.g. swap the mounted world.
   * Note: a host rendered inside `<WorldRenderer>` lives in a separate React reconciler from
   * the page, so bridge this callback out through a module-level store, not React context.
   */
  onEnter?: (to: string | undefined) => void
  /** Floating caption above the gate (e.g. the destination's name). */
  label?: string
  /** Ring radius, in units. */
  radius?: number
  /** Glow / ring color; defaults to the world palette's `accent` slot. */
  color?: string
  /** Arm the trigger. Set false for a decorative or not-yet-open gate. Default true. */
  active?: boolean
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/portal.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/portal.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add portal</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
