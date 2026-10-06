# registry/

The **source registry** (shadcn-style: pull editable component source into your project, then own and edit it). The distribution model is decided — **the shadcn split** — and implemented by [`runek` CLI](../packages/cli).

## Layout

| Path | Role | Maintained |
|---|---|---|
| [`registry.json`](./registry.json) | The **index** — one entry per item (`name`, `type`, `category`, `description`, source `files`). | By hand — add a component here. |
| `components/<name>.json` | The **served manifests** — self-contained: inlined source `content` + auto-derived `dependencies` (npm) and `registryDependencies` (other items). | **Generated** by `just registry`. |
| `props.json` | The **prop schema**: every component's props (type, default, doc, palette slot), keyed by its world-data `type`. Read by the workshop, `runek info`, and `runek validate`. | **Generated** by `just registry` from the component TypeScript. |
| `world.schema.json` | A **JSON Schema** (draft 2020-12) for world files, built from the prop schema. | **Generated** by `just registry`. |
| `schema.json`, `config-schema.json` | JSON Schemas for this index and for `runek.config.json` (served at `/registry/*.json`, where their `$schema` URLs point). | By hand. |
| `agents/SKILL.md` | The agent skill `runek skill` installs. | By hand. |

`dependencies` and `registryDependencies` are derived from each file's imports, so they never drift from the source. After changing a component (or `registry.json`), run **`just registry`** to regenerate `components/`.

Source `content` is stored verbatim. Components import `@runek/core` from npm (each manifest declares it as a `dependency`, pinned to core's version), so there is no import to rewrite and manifests stay layout-agnostic. `core` is not a registry item; only components are copied.

Two item `type`s exist: **`registry:component`** (a `.tsx` source file) and **`registry:composite`** (`house`, `room`) — a data *arrangement* of component nodes stored as JSON (see [CONTRACT §11](../CONTRACT.md)). A composite's `registryDependencies` are derived from the node `type`s its arrangement references, so `add house` pulls the arrangement plus every part it uses.

## Using it

```bash
npx @runek/cli init                         # writes runek.config.json + the install dir
npx @runek/cli add player terrain bookshelf # pulls source + registry deps + installs npm deps
npx @runek/cli list                         # browse the catalog
```

A custom or local registry works via `--registry <url|path>` (e.g. point it at this folder during development: `just cli add bookshelf --registry ./registry`).

The published default registry is `https://runek.nullorder.org/r`, which serves `registry.json`, `components/<name>.json`, `props.json`, `world.schema.json`, and `agents/SKILL.md` from this directory.
