import type { APIRoute } from 'astro'
import { markdownUrl, SITE, sortedDocs } from '../lib/markdown'
import { getComponents } from '../lib/registry'

export const GET: APIRoute = async () => {
  const docs = (await sortedDocs()).filter((d) => d.data.category !== 'component')
  const guides = docs.filter((d) => d.id !== 'changelog')
  const link = (title: string, url: string, note?: string) =>
    `- [${title}](${url})${note ? `: ${note}` : ''}`

  const text = `# Runek

> Runek is a source registry of procedural 3D components for React Three Fiber ("shadcn for 3D worlds"). You pull a component's TypeScript source into your project with the CLI and own it. Every component builds its geometry from props plus a \`seed\`, with no binary assets, so a whole walkable world is plain JSON data.

- Install source with \`npx @runek/cli add <name>\` (\`init\` once first). Components import the small runtime, \`@runek/core\` (the \`<World>\` provider, seeded rng, world data), from npm.
- A world is JSON: \`{ "version": 1, "nodes": [{ "type": "Bench", "props": { "position": [0, 0, 0] } }] }\`. \`type\` is the PascalCase component name; every prop goes under \`props\`.
- Same \`seed\`, same geometry, everywhere. Units are meters, Y is up, rotations are radians.
- Check a world with \`npx @runek/cli validate world.json\` (names, props, values) and \`npx @runek/cli check-world world.json\` (things buried in or floating above the ground).
- Coding agents: start with [Runek for agents](${markdownUrl('for-agents')}).

## Docs

${guides.map((d) => link(d.data.title, markdownUrl(d.id), d.data.summary)).join('\n')}

## Components

${getComponents()
  .map((c) =>
    link(
      `${c.title} (\`${c.name}\`, ${c.category})`,
      markdownUrl(`components/${c.name}`),
      c.description,
    ),
  )
  .join('\n')}

## Machine-readable

${[
  link(
    'Registry index',
    `${SITE}/r/registry.json`,
    'every component name, title, category, and description',
  ),
  link(
    'Prop schema',
    `${SITE}/r/props.json`,
    'every prop of every component, with types, defaults, and docs, keyed by world-data `type`',
  ),
  link(
    'World JSON Schema',
    `${SITE}/r/world.schema.json`,
    'set it as `"$schema"` in a world file for validation and completion',
  ),
  link(
    'Component manifest',
    `${SITE}/r/components/bench.json`,
    'one per component at `/r/components/<name>.json`: inlined source plus dependencies',
  ),
  link(
    'Agent skill',
    `${SITE}/r/agents/SKILL.md`,
    'a ready-made skill for coding agents (`npx @runek/cli skill` installs it)',
  ),
  link('Full docs in one file', `${SITE}/llms-full.txt`),
].join('\n')}

## Optional

${link('Changelog', markdownUrl('changelog'), 'every release and the unreleased changes')}
`
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
