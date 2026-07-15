---
title: "Wall"
summary: "Wall segment with door/window openings and a fixed collider."
category: component
component: wall
order: 100
---

## Add it

```bash
npx @runek/cli add wall
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.12.0`.

## Use it

```tsx
import { Wall } from './runek/Wall'

<Wall position={[0, 0, 0]} />
```

## Props

```ts
export interface WallProps {
  position?: Vec3
  rotation?: Vec3
  /** Length along the wall's local X axis, in units. */
  width?: number
  height?: number
  thickness?: number
  /** Defaults to the world palette's `wall` slot. */
  color?: string
  /** Holes cut into the wall (doors, windows). Must not overlap horizontally. */
  openings?: WallOpening[]
}
```

## Migrate

**v0.11.0 → v0.12.0.** The single `opening` prop became `openings`, an array, so one wall can carry a door and windows together. The `WallOpening` shape itself is unchanged (`offset`, `width`, `height`, `sill`).

<div class="migration">
<div class="migration__col">
<div class="migration__tag">v0.11.0</div>

```tsx
<Wall
  width={9}
  opening={{ width: 1, height: 2.1 }}
/>
```

</div>
<div class="migration__col migration__col--after">
<div class="migration__tag">v0.12.0</div>

```tsx
<Wall
  width={9}
  openings={[
    { width: 1, height: 2.1 },
    { offset: 3, width: 1.3, height: 1.2, sill: 1 },
  ]}
/>
```

</div>
</div>

- Mechanical migration: wrap the object in an array — `opening={X}` becomes `openings={[X]}`; in world files, `"opening": {…}` becomes `"openings": [{…}]`.
- Openings are laid out by `offset` (center offset from the wall center, in units) and must not overlap horizontally.

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/wall.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/wall.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add wall</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
