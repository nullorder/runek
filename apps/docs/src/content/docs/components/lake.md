---
title: "Lake"
summary: "Procedural animated-shader water surface (no textures); place its surface at or below ground level."
category: component
component: lake
order: 100
---

## Add it

```bash
npx @runek/cli add lake
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.10.4`, `three@^0.184.0`.

## Use it

```tsx
import { Lake } from './runek/Lake'

<Lake position={[0, 0, 0]} />
```

## Props

```ts
export interface LakeProps {
  position?: Vec3
  rotation?: Vec3
  /** Water surface `[width, depth]`, in units. */
  size?: [number, number]
  /** Defaults to the world palette's `waterDeep` slot. */
  colorDeep?: string
  /** Defaults to the world palette's `waterShallow` slot. */
  colorShallow?: string
  /** Direction the sun glint comes from; pair with your Sky's `sunPosition`. */
  sunPosition?: Vec3
  waveHeight?: number
  waveSpeed?: number
  segments?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/lake.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/lake.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add lake</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
