---
title: CLI reference
summary: "runek init / add / list / info / validate / check-world / preview / skill: pull editable component source into your project and check your worlds."
category: reference
order: 30
---

The `runek` CLI copies component **source** from the registry into your project — you own and edit the files. Run it with `npx @runek/cli <command>`.

## init

```bash
npx @runek/cli init [options]
```

Writes `runek.config.json` and creates the install directory. Run it once per project.

## add

```bash
npx @runek/cli add <name...> [options]
```

Pulls one or more components. For each, it:

1. resolves **registry dependencies** recursively (e.g. `house` also pulls its walls, floor, roof, door, and window as source),
2. writes the source into your install directory verbatim (components import `@runek/core` from npm, so there's no import to rewrite),
3. installs the npm **dependencies**, including `@runek/core`, with your package manager (auto-detected from the lockfile).

```bash
npx @runek/cli add player terrain bookshelf
```

## list

```bash
npx @runek/cli list [options]
```

Prints the catalog, grouped by category. `--json` prints the registry index items instead (`name`, `title`, `type`, `category`, `description`, `files`).

## info

```bash
npx @runek/cli info <name> [options]
```

Shows one component without installing it: its description, the `add` command, the npm and registry dependencies it pulls, every prop with its type, default, and doc (code-only props such as callbacks are marked), the nested types it takes (like `Person`'s `PersonGarment`), and a minimal world node and JSX line to start from. `<name>` is the registry name (`bookshelf`) or the world-data type (`Bookshelf`), in any case; a near miss suggests the closest name. It reads only the registry, so it works before `init`.

```bash
npx @runek/cli info bench
#   Bench (bench, interiors)
#   ...
#   Props
#     length      number     = 1.6
#                 Length, in units.
#     back        boolean    = true
#                 Include a backrest.
#     color       color      = palette.wood
#   World node
#     {"type":"Bench","props":{"position":[0,0,0]}}
```

`--json` prints the same card as one object: `name`, `title`, `kind`, `category`, `description`, `doc`, `add`, `dependencies`, `registryDependencies`, `props` (`name`, `type`, `optional`, `default`, `palette`, `computed`, `doc`, `codeOnly`), `types`, and `example` (`node`, `jsx`).

## validate

```bash
npx @runek/cli validate <world.json> [options]
```

Checks a world file against the components' prop schema (served at `/r/props.json`): unknown world fields, node fields and component types, props a component doesn't have, and values of the wrong type or outside an enum, each with a "did you mean" when a name is close. Invalid JSON is reported with its line and column. Components that are not in the registry but have a source file in your install directory (your own `MyThing.tsx`) are accepted as is.

```bash
npx @runek/cli validate public/world.json
#   error   avatar Avatar is "first", "third" or "overhead".
#   warning nodes[1].props.colr Bookshelf has no prop "colr". Did you mean "color"?
#   warning nodes[2].type Unknown component "Benchh". Did you mean "Bench"?
```

Errors (the world can't load) exit non-zero; warnings (it renders, maybe not as meant) only with `--strict`. `--json` prints `{ valid, errors, warnings, issues: [{ path, pathString, severity, message }] }`, where `path` is the JSON path as an array (`["nodes", 1, "props", "colr"]`). It uses `validateWorld` from your installed `@runek/core` (0.14 or newer). Editors can check the same rules as you type through the world JSON Schema: see [Worlds as data](/docs/worlds-as-data).

## check-world

```bash
npx @runek/cli check-world <world.json> [options]
```

Finds nodes that are **buried** (below the terrain) or **floating** (above the highest surface), and open water that stands above its shore. It reads the ground from your own component source (the `surfaces/*.ts` modules that ship with `terrain`, `dock`, `floor`, `slab`, `shore`, and `lake`) and the ground math from your installed `@runek/core`, so it checks exactly what your app renders. Only components marked `groundSitting` are checked, and anchored nodes pass by construction.

```bash
npx @runek/cli check-world public/world.json
#   buried Tent [70] at (-28, 0.42, 110) is 1.8 below the ground (2.22); set position[1] to 2.216, or anchor it
```

`--fix` writes each suggested Y into the file; `--strict` exits non-zero when anything is found, so an app can run it in CI. `--json` prints `{ surfaces, issues }` (plus `fixed` with `--fix`), each issue with its `kind`, ground-index `path`, `type`, `id`, `at`, `ground`, and suggested `fix`. Loading `.ts` surfaces needs Node 22.18 or newer. See [Placing things on uneven ground](/docs/placing-things-on-uneven-ground).

## preview

```bash
npx @runek/cli preview <world.json> [--open]
```

Prints a [workshop](/docs/the-workshop) link that carries the whole world in its URL, the same as the workshop's own share links, so you (or whoever you send it to) can see a world file rendered without running an app. `--open` opens it in your browser. Very large worlds make long links; past 8,000 characters it warns. With a registry served by a Runek docs site (a URL ending in `/r`), the link points at that site's workshop.

## skill

```bash
npx @runek/cli skill [--out <path>] [--overwrite]
```

Installs the Runek agent skill (served at `/r/agents/SKILL.md`): how to add components, write and check world files, and place things, for coding agents working in your project. It writes `.claude/skills/runek/SKILL.md` by default; `--out` puts it anywhere else, such as another agent's rules folder. An existing file is kept unless you pass `--overwrite`. See [Runek for agents](/docs/for-agents).

## Options

| Option | Commands | Description |
|---|---|---|
| `--registry <url\|path>` | all | Registry base. Defaults to the configured one (`https://runek.nullorder.org/r`). A local path works for development. |
| `--dir <path>` | init, add, validate, check-world | Install directory (default `src/runek`). |
| `--overwrite` | add, skill | Replace files that already exist (otherwise they're skipped). |
| `--no-install` | add | Print the dependency install command instead of running it. |
| `--force` | init | Overwrite an existing `runek.config.json`. |
| `--strict` | validate, check-world | Exit non-zero on any issue (validate: warnings too). |
| `--fix` | check-world | Write the suggested Y values into the world file. |
| `--tolerance <units>` | check-world | Allowed gap before a node is flagged (default `0.08`). |
| `--json` | list, info, validate, check-world | Machine-readable JSON on stdout, for scripts and agents. |
| `--out <path>` | skill | Where to write the skill (default `.claude/skills/runek/SKILL.md`). |
| `--open` | preview | Open the link in your browser. |
| `-v, --version` | — | Print the CLI version (also `runek version`): a pixel banner in a terminal, the bare version when piped. |
| `-h, --help` | — | Show help. |

## runek.config.json

```json
{
  "$schema": "https://runek.nullorder.org/registry/config-schema.json",
  "registry": "https://runek.nullorder.org/r",
  "dir": "src/runek"
}
```

- **registry** — where components are fetched from.
- **dir** — where component source is written. The runtime comes from the `@runek/core` npm package, not copied here.

## Registry index

The default registry is served at [`https://runek.nullorder.org/r`](https://runek.nullorder.org/r). Its index lists every component (name, type, description); each entry resolves to a self-contained manifest under `components/<name>.json`. Point `--registry` at it (the default) or at a local copy for development.

<a class="manifest-card" href="https://runek.nullorder.org/r/registry.json">
<span class="manifest-card__label">registry index</span>
<span class="manifest-card__path">/r/registry.json</span>
<span class="manifest-card__hint">The catalog the CLI reads first: every component name, type, and description.</span>
</a>
