# registry/

A **stub** of the copy-paste distribution mechanism (shadcn-style). [`registry.json`](./registry.json) is a machine-readable manifest mapping each component to its source files and dependencies.

This is intentionally minimal. The distribution model is still an open decision (registry CLI vs scoped npm packages) — so the `npx runek add <component>` CLI that consumes this manifest is deferred until that's settled. For now the manifest documents the intended shape; the canonical source remains under `packages/`.
