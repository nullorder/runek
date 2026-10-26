---
title: "ChessBoard"
summary: "A chess board with a full set of turned pieces, set from a FEN position or played out from the seed into a mid-game, on a table top or its own pedestal."
category: component
component: chessboard
order: 100
---

## Add it

```bash
npx @runek/cli add chessboard
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.16.0`, `three@^0.184.0`.

## Use it

```tsx
import { ChessBoard } from './runek/ChessBoard'

<ChessBoard position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "ChessBoard", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `fen` | `string` |  | A position in Forsyth-Edwards Notation (the placement field is enough), or `start`. Unset, the seed plays out a mid-game: some pieces taken, pawns pushed, pieces developed. |
| `size` | `number` | `0.45` | Board width across its frame, in units. |
| `table` | `boolean` | `false` | Stand it on its own pedestal table; otherwise it lies on whatever top it is placed on. |
| `lightSquare` | `color` | `"#e8d7b0"` | The light squares. |
| `darkSquare` | `color` | `"#6b4a2b"` | The dark squares (a1 is dark). |
| `frameColor` | `color` |  | The frame and the pedestal; defaults to the palette's `wood`. |
| `whiteColor` | `color` | `"#efe6d2"` | White's pieces. |
| `blackColor` | `color` | `"#2a2522"` | Black's pieces. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/chessboard.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/chessboard.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add chessboard</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
