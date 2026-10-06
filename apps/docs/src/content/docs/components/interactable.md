---
title: "Interactable"
summary: "Wrap anything to make it something the player can act on: walk within range and a prompt shows its actions with the keys the world binds to them; press one and onAction gets its id. Only the nearest in range takes the key, and keys yield to text fields."
category: component
component: interactable
order: 100
---

## Add it

```bash
npx @runek/cli add interactable
```

Pulls `sign`, `@react-three/drei@^10.7.7`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Interactable } from './runek/Interactable'

<Interactable position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Interactable", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `actions` | `InteractionAction[]` | `[]` | What the player can do here. Each names a world `controls` action for its key, so declare it in the world (`controls: { use: ['KeyE'] }`). |
| `radius` | `number` | `2` | How close the avatar must come for the prompt to show, in units. |
| `promptHeight` | `number` | `1.4` | Height of the prompt above the origin, in units. |
| `onAction` | `function` (code only) |  |  |
| `children` | `node` (code only) |  |  |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |

### `InteractionAction`

| Prop | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | **required** | Passed back to `onAction`. |
| `label` | `string` | **required** | Shown in the prompt, e.g. `Talk`. |
| `control` | `string` | **required** | The world `controls` action that triggers it (declare `talk: ['KeyT']` in the world's `controls`). The prompt shows the key bound to it, so a remap relabels it. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/interactable.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/interactable.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add interactable</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
