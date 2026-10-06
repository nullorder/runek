---
title: "Roof"
summary: "Flat or gable roof."
category: component
component: roof
order: 100
---

## Add it

```bash
npx @runek/cli add roof
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Roof } from './runek/Roof'

<Roof position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Roof", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `size` | `[number, number]` | `[8, 8]` | `[width, depth]` in units. The roof rests with its base at the component origin. |
| `style` | `"flat" \| "gable"` | `"gable"` |  |
| `peak` | `number` | `1.6` | Ridge height for a gable roof, in units. |
| `thickness` | `number` | `0.18` | Thickness, in units. |
| `overhang` | `number` | `0.3` |  |
| `ends` | `boolean` | `true` | Cap the triangular gable ends so the attic isn't open to the outside. |
| `color` | `color` | palette `roof` | Defaults to the world palette's `roof` slot. |
| `endColor` | `color` | palette `wall` | Gable end caps; defaults to the world palette's `wall` slot. |

## Migrate

**v0.11.0 → v0.12.0.** No signature break, but gable roofs now cap their open triangular ends with wall-colored prisms (the attic used to show the sky). The old look is one prop away.

<div class="migration">
<div class="migration__col">
<div class="migration__tag">v0.11.0</div>

```tsx
<Roof style="gable" />
// v0.11.0: gable ends rendered open
```

</div>
<div class="migration__col migration__col--after">
<div class="migration__tag">v0.12.0</div>

```tsx
<Roof style="gable" />
// v0.12.0: ends are capped by default

<Roof style="gable" ends={false} />
// opt back into the open look
```

</div>
</div>

- The caps default to the palette `wall` slot; override with `endColor`.

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/roof.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/roof.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add roof</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
