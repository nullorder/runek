---
title: "Shore"
summary: "Sloped beach/shore strip to meet a Lake."
category: component
component: shore
order: 100
---

## Add it

```bash
npx @runek/cli add shore
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.9.0`.

## Use it

```tsx
import { Shore } from './runek/Shore'

<Shore position={[0, 0, 0]} />
```

## Props

```ts
export interface ShoreProps {
  position?: Vec3
  rotation?: Vec3
  /** `[width, depth]` in units. The sandy top sits at the component origin. */
  size?: [number, number]
  thickness?: number
  /** Defaults to the world palette's `sand` slot. */
  color?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/shore.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/shore.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add shore</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/shore)**.
