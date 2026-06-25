---
title: "Campfire"
summary: "Stone ring, a tepee of logs, and an animated flame with a warm flickering light."
category: component
component: campfire
order: 100
---

## Add it

```bash
npx @runek/cli add campfire
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.10.0`, `three@^0.184.0`.

## Use it

```tsx
import { Campfire } from './runek/Campfire'

<Campfire position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface CampfireProps {
  position?: Vec3
  rotation?: Vec3
  radius?: number
  /** Log color; defaults to the world palette's `wood` slot. */
  logColor?: string
  flameColor?: string
  intensity?: number
  seed?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/campfire.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/campfire.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add campfire</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/campfire)**.
