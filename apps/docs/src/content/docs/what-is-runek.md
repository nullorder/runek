---
title: What is Runek?
summary: A source registry of procedural 3D components for React Three Fiber — shadcn for 3D worlds.
category: intro
order: 1
---

Runek is a **source registry** of procedural 3D components for
[React Three Fiber](https://r3f.docs.pmnd.rs/). You pull a component's source into
your project with one command and own it — no black box, no version lock.

Every component — a bookshelf, a lake, a whole house — generates its own geometry
from **props and a `seed`**. There are no `.glb` files, no textures, no CDN. A whole
world is just data: diffable, forkable, and version-controlled like any repo.

## The five principles (the moat)

1. **Procedural-first** — geometry from props + `seed`; no binary assets.
2. **A world is data** — every component is a pure, deterministic function of its props.
3. **Seeded determinism** — same seed → same result, everywhere.
4. **Parametric LOD** — detail scales with props and distance.
5. **Local-first** — no backend; a world deploys as a static site.

This very documentation is a Runek world: a walkable library built from the
components it documents. Read the [getting started guide](/docs/getting-started) to
compose your first scene.
