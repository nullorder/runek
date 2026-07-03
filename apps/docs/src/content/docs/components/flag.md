---
title: "Flag"
summary: "A cloth flag on a pole; the cloth ripples per-frame, pinned at the luff. Thin pole collider."
category: component
component: flag
order: 100
---

## Add it

```bash
npx @runek/cli add flag
```

Pulls `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.4`, `three@^0.184.0`.

## Use it

```tsx
import { Flag } from './runek/Flag'

<Flag position={[0, 0, 0]} />
```

## Props

```ts
export interface FlagProps extends WorldComponentProps {
  /** Pole height, in units. */
  poleHeight?: number
  /** Flag width away from the pole (the fly), in units. */
  fly?: number
  /** Flag height (the drop), in units. */
  drop?: number
  /** Ripple speed. */
  waveSpeed?: number
  /** Ripple depth as a fraction of the fly. */
  waveAmplitude?: number
  /** Cloth color; defaults to the world palette's `fabric`. */
  color?: string
  /** Pole color; defaults to the palette's `wood`. */
  poleColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/flag.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/flag.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add flag</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
