---
title: "Rug"
summary: "Procedural striped rug (seeded stripes, no textures)."
category: component
component: rug
order: 100
---

## Add it

```bash
npx @runek/cli add rug
```

Pulls `@runek/core@^0.9.0`.

## Use it

```tsx
import { Rug } from './runek/Rug'

<Rug position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface RugProps {
  position?: Vec3
  rotation?: Vec3
  /** `[width, depth]` in units. */
  size?: [number, number]
  /** Defaults to the world palette's `fabric` slot. */
  baseColor?: string
  /** Defaults to the world palette's `accent` slot. */
  borderColor?: string
  accentColor?: string
  seed?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/rug.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/rug.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add rug</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/rug)**.
