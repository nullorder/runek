---
title: "Window"
summary: "Window with frame and translucent pane."
category: component
component: window
order: 100
---

## Add it

```bash
npx @runek/cli add window
```

Pulls `@runek/core@^0.10.0`.

## Use it

```tsx
import { Window } from './runek/Window'

<Window position={[0, 0, 0]} />
```

## Props

```ts
export interface WindowProps {
  position?: Vec3
  rotation?: Vec3
  width?: number
  height?: number
  /** Frame bar thickness, in units. */
  frame?: number
  depth?: number
  color?: string
  glassColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/window.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/window.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add window</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/window)**.
