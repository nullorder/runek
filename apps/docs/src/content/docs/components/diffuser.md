---
title: "Diffuser"
summary: "A skyline acoustic diffuser: wooden blocks on a backboard, their depths from a quadratic-residue sequence, instanced. Wall-mounted, decorative."
category: component
component: diffuser
order: 100
---

## Add it

```bash
npx @runek/cli add diffuser
```

Pulls `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { Diffuser } from './runek/Diffuser'

<Diffuser position={[0, 0, 0]} cells={11} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Diffuser", "props": { "position": [0, 0, 0], "cells": 11, "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `1.2` | Width, in units. |
| `height` | `number` | `1.2` | Height, in units. |
| `cells` | `number` | `11` | Blocks across; the rows follow from the height. |
| `depth` | `number` | `0.2` | The deepest block, in units. |
| `color` | `color` | palette `wood` | Defaults to the world palette's `wood` slot. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/diffuser.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/diffuser.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add diffuser</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
