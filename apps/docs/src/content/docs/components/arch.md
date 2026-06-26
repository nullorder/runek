---
title: "Arch"
summary: "Freestanding gateway: two piers and a semicircular arch of voussoirs. Composes with Wall."
category: component
component: arch
order: 100
---

## Add it

```bash
npx @runek/cli add arch
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.1`.

## Use it

```tsx
import { Arch } from './runek/Arch'

<Arch position={[0, 0, 0]} />
```

## Props

```ts
export interface ArchProps {
  position?: Vec3
  rotation?: Vec3
  /** Clear opening width, in units. */
  width?: number
  /** Height to the springline (top of the piers), in units. */
  height?: number
  depth?: number
  /** Pier thickness, in units. */
  thickness?: number
  /** Voussoir blocks forming the semicircular arch. */
  blocks?: number
  /** Defaults to the world palette's `stone` slot. */
  color?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/arch.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/arch.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add arch</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/arch)**.
