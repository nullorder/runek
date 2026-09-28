---
title: "Bed"
summary: "Bed with a frame, mattress, pillows, and a headboard."
category: component
component: bed
order: 100
---

## Add it

```bash
npx @runek/cli add bed
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`.

## Use it

```tsx
import { Bed } from './runek/Bed'

<Bed position={[0, 0, 0]} />
```

## Props

```ts
export interface BedProps {
  position?: Vec3
  rotation?: Vec3
  width?: number
  length?: number
  /** Frame color; defaults to the world palette's `wood` slot. */
  color?: string
  /** Bedding color; defaults to the world palette's `fabric` slot. */
  beddingColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/bed.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/bed.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add bed</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
