---
title: "Lamp"
summary: "Lamp that emits a point light."
category: component
component: lamp
order: 100
---

## Add it

```bash
npx @runek/cli add lamp
```

Pulls `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.12.0`, `three@^0.184.0`.

## Use it

```tsx
import { Lamp } from './runek/Lamp'

<Lamp position={[0, 0, 0]} />
```

## Props

```ts
export interface LampProps {
  position?: Vec3
  rotation?: Vec3
  height?: number
  /** Base + pole color. Defaults to the world palette's `metal` slot. */
  color?: string
  shadeColor?: string
  lightColor?: string
  intensity?: number
  /** Candle-like intensity flicker, 0–1; 0 holds the light steady. */
  flicker?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/lamp.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/lamp.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add lamp</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
