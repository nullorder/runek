---
title: "Monitor"
summary: "A desk monitor on a foot, plate, or legs. Switched on, the screen glows in its own color with a few seeded windows and lines of text on it, all geometry."
category: component
component: monitor
order: 100
---

## Add it

```bash
npx @runek/cli add monitor
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Monitor } from './runek/Monitor'

<Monitor position={[0, 0, 0]} />
```

## Props

```ts
export interface MonitorProps extends WorldComponentProps {
  /** Screen width, in units. */
  width?: number
  /** Width over height. */
  aspect?: number
  /** Seeded when unset. */
  stand?: MonitorStand
  /** The screen's glow when on. Seeded from a few calm tints when unset. */
  screen?: string
  /** Lit, showing a few seeded windows; off, a dark glass. */
  on?: boolean
  /** Bezel and stand; defaults to the palette's `metal`. */
  color?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/monitor.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/monitor.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add monitor</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
