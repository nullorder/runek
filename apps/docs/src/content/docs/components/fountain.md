---
title: "Fountain"
summary: "Two-tier stone fountain with gently rippling water (a per-frame bob, no textures)."
category: component
component: fountain
order: 100
---

## Add it

```bash
npx @runek/cli add fountain
```

Pulls `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.4`, `three@^0.184.0`.

## Use it

```tsx
import { Fountain } from './runek/Fountain'

<Fountain position={[0, 0, 0]} />
```

## Props

```ts
export interface FountainProps {
  position?: Vec3
  rotation?: Vec3
  radius?: number
  /** Stone color; defaults to the world palette's `stone` slot. */
  color?: string
  /** Water color; defaults to the world palette's `waterShallow` slot. */
  waterColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/fountain.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/fountain.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add fountain</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
