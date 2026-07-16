---
title: "Bush"
summary: "Clustered foliage blobs, seeded; the mid-height density between Grass and Trees."
category: component
component: bush
order: 100
---

## Add it

```bash
npx @runek/cli add bush
```

Pulls `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Bush } from './runek/Bush'

<Bush position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface BushProps {
  position?: Vec3
  rotation?: Vec3
  /** Overall radius, in units. */
  radius?: number
  /** Number of foliage blobs. */
  blobs?: number
  /** Defaults to the world palette's `foliage` slot. */
  color?: string
  seed?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/bush.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/bush.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add bush</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
