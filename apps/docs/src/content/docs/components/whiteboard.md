---
title: "Whiteboard"
summary: "A whiteboard on a rolling stand or a wall, with seeded marker diagrams (boxes, arrows, lines of writing) and optional text across the top."
category: component
component: whiteboard
order: 100
---

## Add it

```bash
npx @runek/cli add whiteboard
```

Pulls `sign`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Whiteboard } from './runek/Whiteboard'

<Whiteboard position={[0, 0, 0]} />
```

## Props

```ts
export interface WhiteboardProps extends WorldComponentProps {
  /** Board width, in units. */
  width?: number
  /** Board height, in units. */
  height?: number
  mount?: WhiteboardMount
  /** Written across the top of the board in marker. */
  text?: string
  /** Seeded marker diagrams (boxes, arrows, lines). Set false for a clean board. */
  doodles?: boolean
  /** Frame and stand; defaults to the palette's `metal`. */
  color?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/whiteboard.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/whiteboard.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add whiteboard</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
