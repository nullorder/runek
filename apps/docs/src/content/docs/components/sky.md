---
title: "Sky"
summary: "Procedural atmosphere (drei Sky)."
category: component
component: sky
order: 100
---

## Add it

```bash
npx @runek/cli add sky
```

Pulls `@react-three/drei@^10.7.7`, `@react-three/fiber@^9.6.1`, `@runek/core@^0.12.0`.

## Use it

```tsx
import { Sky } from './runek/Sky'

<Sky position={[0, 0, 0]} />
```

## Props

```ts
export interface SkyProps {
  /** Direction of the sun; also where the bright spot appears. Set this to pin the
   *  sky to a fixed sun and bypass the world's day/night cycle. */
  sunPosition?: Vec3
  turbidity?: number
  rayleigh?: number
  /** Background when the sun is below the horizon. */
  nightColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/sky.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/sky.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add sky</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
