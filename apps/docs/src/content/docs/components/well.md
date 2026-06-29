---
title: "Well"
summary: "Stone well with a dark pool, posts, a little pyramid roof, and a bucket on a rope."
category: component
component: well
order: 100
---

## Add it

```bash
npx @runek/cli add well
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.4`.

## Use it

```tsx
import { Well } from './runek/Well'

<Well position={[0, 0, 0]} />
```

## Props

```ts
export interface WellProps {
  position?: Vec3
  rotation?: Vec3
  radius?: number
  wallHeight?: number
  /** Stone color; defaults to the world palette's `stone` slot. */
  color?: string
  /** Roof + frame color; defaults to the world palette's `wood` slot. */
  roofColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/well.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/well.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add well</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
