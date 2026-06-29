---
title: "Flowers"
summary: "Instanced seeded wildflowers (stem + colored head) scattered over a patch."
category: component
component: flowers
order: 100
---

## Add it

```bash
npx @runek/cli add flowers
```

Pulls `@runek/core@^0.10.4`, `three@^0.184.0`.

## Use it

```tsx
import { Flowers } from './runek/Flowers'

<Flowers position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface FlowersProps {
  position?: Vec3
  rotation?: Vec3
  /** Patch extent `[width, depth]`, in units. */
  area?: [number, number]
  count?: number
  height?: number
  /** Stem color; defaults to the world palette's `foliage` slot. */
  stemColor?: string
  seed?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/flowers.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/flowers.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add flowers</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
