---
title: "Ocean"
summary: "Camera-following animated-shader ocean that reaches the world fog horizon (no textures); sits at the world ground."
category: component
component: ocean
order: 100
---

## Add it

```bash
npx @runek/cli add ocean
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Ocean } from './runek/Ocean'

<Ocean position={[0, 0, 0]} />
```

## Props

```ts
export interface OceanProps {
  position?: Vec3
  rotation?: Vec3
  /** Plane size `[width, depth]`, in units. With `follow` on (the default) this patch tracks
   *  the camera, so keep it large enough to reach past the world fog. */
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
  /** Track the camera horizontally for an endless sea (default true). Set false to pin it. */
  follow?: boolean
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/ocean.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/ocean.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add ocean</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
