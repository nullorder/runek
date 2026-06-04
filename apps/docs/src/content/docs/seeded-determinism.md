---
title: Seeded determinism
summary: Same seed → same world, on every machine and every render. The seeded RNG and its helpers.
category: guide
order: 16
---

Procedural variety in Runek is **deterministic**: a component's randomness comes
from a single `seed`, so the same seed always produces the same result. Commit the
number and the world is locked forever; change it to roll a new variation.

## The RNG

`rng(seed)` returns a stream — call it for the next value in `[0, 1)`:

```tsx
import { rng } from './runek/core'

const next = rng(42)
next() // 0.37… — and always the same first value for seed 42
next() // 0.81…
```

## Helpers

```tsx
import { rng, range, int, pick, sub } from './runek/core'

const next = rng(42)
range(next, 0, 10)            // a float in [0, 10)
int(next, 1, 6)              // an integer in [1, 6] (inclusive)
pick(next, ['oak', 'pine'])  // a stable choice from a list
```

## Stable child seeds

When a component composes others (a `House` placing `Window`s), derive child seeds
with `sub(seed, n)` so each child is deterministic *and* distinct — without
threading the same stream through everything:

```tsx
import { sub } from './runek/core'

<Window seed={sub(seed, 0)} />
<Window seed={sub(seed, 1)} />
```

## Why it matters

- **Reproducible** — the same world renders identically everywhere.
- **Diffable & forkable** — a world is data + seeds, so it lives in git like code.
- **Cheap variety** — one number yields a whole new arrangement.
