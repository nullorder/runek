---
title: "Level"
summary: "A stackable wall ring plus optional slab: per-side openings, sides that can be omitted, and a stairwell hole — the unit a building is composed from."
category: component
component: level
order: 100
---

## Add it

```bash
npx @runek/cli add level
```

Pulls `floor`, `wall`, `@runek/core@^0.12.0`.

## Use it

```tsx
import { Level } from './runek/Level'

<Level position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface LevelProps {
  position?: Vec3
  rotation?: Vec3
  /** Interior footprint `[width, depth]`, in units. */
  size?: [number, number]
  height?: number
  thickness?: number
  /** Per-side wall configs; an omitted side renders a solid wall. */
  walls?: LevelWalls
  /** The slab underfoot; `false` for none, or a config with a stairwell `opening`. */
  floor?: boolean | LevelFloorConfig
  /** Defaults to the world palette's `wall` slot. */
  color?: string
  /** Reserved for procedural variation. */
  seed?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/level.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/level.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add level</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
