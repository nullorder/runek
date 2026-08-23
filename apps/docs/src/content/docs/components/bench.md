---
title: "Bench"
summary: "Slatted bench with an optional backrest; indoor or outdoor seating."
category: component
component: bench
order: 100
---

## Add it

```bash
npx @runek/cli add bench
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.12.0`.

## Use it

```tsx
import { Bench } from './runek/Bench'

<Bench position={[0, 0, 0]} />
```

## Props

```ts
export interface BenchProps {
  position?: Vec3
  rotation?: Vec3
  length?: number
  depth?: number
  seatHeight?: number
  /** Include a backrest. */
  back?: boolean
  /** Defaults to the world palette's `wood` slot. */
  color?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/bench.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/bench.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add bench</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
