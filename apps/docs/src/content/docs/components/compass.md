---
title: "Compass"
summary: "A screen-fixed HUD compass: a glassy dial in a corner of the canvas whose rose card swings with the camera heading, with a fixed lubber line and an optional wind + bearing readout — works with any traversal that drives the camera (on foot or at a vehicle's chase-cam)."
category: component
component: compass
order: 100
---

## Add it

```bash
npx @runek/cli add compass
```

Pulls `@react-three/drei@^10.7.7`, `@react-three/fiber@^9.6.1`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Compass } from './runek/Compass'

<Compass position={[0, 0, 0]} />
```

## Props

```ts
export interface CompassProps extends WorldComponentProps {
  /** Screen corner the dial sits in. */
  corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /** Dial diameter, in CSS px (shrinks ~22% on narrow viewports). */
  size?: number
  /** Inset from the corner edges, in CSS px `[x, y]`. */
  inset?: [number, number]
  /** Show the wind + bearing readout pill under the dial. */
  readout?: boolean
  /**
   * World yaw (radians) the dial reads as north, using the same convention as `Player`/`Helm`
   * yaw: 0 faces +Z, so the default makes +Z north (and -X east).
   */
  north?: number
  /** North needle + north letter color. Compass-north red; no palette slot fits. */
  accentColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/compass.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/compass.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add compass</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
