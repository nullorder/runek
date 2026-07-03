---
title: "Dock"
summary: "A plank jetty on pilings reaching out over water; walkable deck colliders, side stringers, and seaward mooring posts."
category: component
component: dock
order: 100
---

## Add it

```bash
npx @runek/cli add dock
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.4`.

## Use it

```tsx
import { Dock } from './runek/Dock'

<Dock position={[0, 0, 0]} />
```

## Props

```ts
export interface DockProps extends WorldComponentProps {
  /** How far the jetty reaches out from the shore (local +Z), in units. */
  length?: number
  /** Walkway width (local X), in units. */
  width?: number
  /** How deep the pilings sink below the deck surface, in units. */
  depth?: number
  /** Deck color; defaults to the world palette's `wood`. */
  color?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/dock.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/dock.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add dock</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
