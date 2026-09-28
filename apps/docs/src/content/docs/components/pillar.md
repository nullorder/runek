---
title: "Pillar"
summary: "Column with a plinth, a tapered (optionally fluted) shaft, and a capital."
category: component
component: pillar
order: 100
---

## Add it

```bash
npx @runek/cli add pillar
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`.

## Use it

```tsx
import { Pillar } from './runek/Pillar'

<Pillar position={[0, 0, 0]} />
```

## Props

```ts
export interface PillarProps {
  position?: Vec3
  rotation?: Vec3
  height?: number
  /** Shaft radius at the base, in units. */
  radius?: number
  /** Vertical flutes around the shaft; 0 = smooth. */
  flutes?: number
  /** Defaults to the world palette's `stone` slot. */
  color?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/pillar.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/pillar.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add pillar</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
