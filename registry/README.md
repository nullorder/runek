# registry/

The **source registry** (shadcn-style: pull editable component source into your
project, then own and edit it). The distribution model is decided — **Path A** in
[`plan/open-questions.md`](../plan/open-questions.md) — and implemented by
[`@runek/cli`](../packages/cli).

## Layout

| Path | Role | Maintained |
|---|---|---|
| [`registry.json`](./registry.json) | The **index** — one entry per item (`name`, `type`, `category`, `description`, source `files`). | By hand — add a component here. |
| `components/<name>.json` | The **served manifests** — self-contained: inlined source `content` + auto-derived `dependencies` (npm) and `registryDependencies` (other items). | **Generated** by `just registry`. |

`dependencies` and `registryDependencies` are derived from each file's imports, so
they never drift from the source. After changing a component (or `registry.json`),
run **`just registry`** to regenerate `components/`.

Source `content` is stored verbatim; the CLI repoints the `@runek/core` import at
the user's installed copy (default `./core`) at `add` time, so manifests stay
layout-agnostic.

## Using it

```bash
npx runek init                         # writes runek.config.json + the install dir
npx runek add player terrain bookshelf # pulls source + registry deps + installs npm deps
npx runek list                         # browse the catalog
```

A custom or local registry works via `--registry <url|path>` (e.g. point it at this
folder during development: `just cli add bookshelf --registry ./registry`).

The published default registry is `https://runek.dev/r`, which serves `registry.json`
and `components/<name>.json` from this directory.
