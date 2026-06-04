---
title: Units & colliders
summary: One unit is one meter; colliders track gameplay surface, not visual detail.
category: guide
order: 18
---

## Units

- **1 unit = 1 meter**, **Y is up**, rotations are in **radians**.
- Components multiply their dimensions by `unit` from `useWorld()`, so a whole
  world can be rescaled from one place (`<World unit={…}>`).

```tsx
const { unit } = useWorld()
const tableHeight = 0.75 * unit // 75 cm
```

## Colliders

Every component registers its own physics colliders via a Rapier `RigidBody`. The
guiding rule: **collider complexity should match gameplay surface, not visual
detail.** A bookshelf is one cuboid you can't walk through — not one collider per
book.

| Shape | When | Example |
|---|---|---|
| `cuboid` | Box-like solids | Bookshelf, walls, crates |
| Several fixed cuboids | Composed structures | Room (4 walls + floor) |
| Convex hull | Faceted irregular solids | Rocks |
| Trimesh | Arbitrary surfaces where visual = collision | Terrain |

Trimesh is the most expensive — reach for it only when a shape genuinely needs
arbitrary geometry (displaced terrain). Prefer cuboids and hulls everywhere else.

Turn on `<World debug>` to see collider wireframes while building.
