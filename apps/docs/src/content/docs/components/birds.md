---
title: "Birds"
summary: "A loose flock circling overhead, each bird flapping on its own seeded orbit."
category: component
component: birds
order: 100
---

## Add it

```bash
npx @runek/cli add birds
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.10.0`, `three@^0.184.0`.

## Use it

```tsx
import { Birds } from './runek/Birds'

<Birds position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface BirdsProps {
  position?: Vec3
  rotation?: Vec3
  count?: number
  /** Orbit spread, in units. */
  area?: number
  height?: number
  speed?: number
  color?: string
  seed?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/birds.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/birds.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add birds</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/birds)**.
