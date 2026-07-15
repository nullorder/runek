#!/usr/bin/env node
// Generate a Markdown doc per component from the registry, so /docs covers the
// whole catalog and stays in sync with the source. Re-run after `just registry`.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MIGRATIONS } from './migrations.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const registryDir = join(root, 'registry')
const outDir = join(root, 'apps/docs/src/content/docs/components')

const index = JSON.parse(readFileSync(join(registryDir, 'registry.json'), 'utf8'))
const components = index.items.filter(
  (i) => i.type === 'registry:component' || i.type === 'registry:composite',
)

// Where the registry is served (the CLI's default base).
const REGISTRY = 'https://runek.nullorder.org/r'

mkdirSync(outDir, { recursive: true })

for (const item of components) {
  const manifest = JSON.parse(
    readFileSync(join(registryDir, 'components', `${item.name}.json`), 'utf8'),
  )
  const source = manifest.files[0]?.content ?? ''

  if (item.type === 'registry:composite') {
    writeFileSync(join(outDir, `${item.name}.md`), compositeDoc(item, manifest, source))
    console.log(`  docs/components/${item.name}.md (composite)`)
    continue
  }
  // Match with or without an `extends` clause between the name and the brace.
  const propsMatch = source.match(/export interface \w*Props[^{]*\{[\s\S]*?\n\}/)
  const hasSeed = /\bseed\b/.test(propsMatch?.[0] ?? '')
  const deps = [...manifest.registryDependencies, ...manifest.dependencies]

  const usage = hasSeed
    ? `<${item.title} position={[0, 0, 0]} seed={1} />`
    : `<${item.title} position={[0, 0, 0]} />`

  const body = `---
title: ${JSON.stringify(item.title)}
summary: ${JSON.stringify(item.description)}
category: component
component: ${item.name}
order: 100
---

## Add it

\`\`\`bash
npx @runek/cli add ${item.name}
\`\`\`
${deps.length ? `\nPulls ${deps.map((d) => `\`${d}\``).join(', ')}.\n` : ''}
## Use it

\`\`\`tsx
import { ${item.title} } from './runek/${item.title}'

${usage}
\`\`\`
${propsMatch ? `\n## Props\n\n\`\`\`ts\n${propsMatch[0]}\n\`\`\`\n` : ''}${migrateSection(item)}
## Registry manifest

<a class="manifest-card" href="${REGISTRY}/components/${item.name}.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/${item.name}.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add ${item.name}</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
`

  writeFileSync(join(outDir, `${item.name}.md`), body)
  console.log(`  docs/components/${item.name}.md`)
}

console.log(`\nWrote ${components.length} component docs.`)

/** The "Migrate" section for items whose API changed across a version: a
 *  side-by-side before/after panel per entry (data in migrations.mjs). Raw HTML
 *  wrappers with blank-line-sandwiched fences, so shiki still highlights the code. */
function migrateSection(item) {
  const entries = MIGRATIONS[item.name]
  if (!entries?.length) return ''
  const blocks = entries.map(
    (m) => `**v${m.from} → v${m.to}.** ${m.summary}

<div class="migration">
<div class="migration__col">
<div class="migration__tag">v${m.from}</div>

\`\`\`${m.before.lang}
${m.before.code}
\`\`\`

</div>
<div class="migration__col migration__col--after">
<div class="migration__tag">v${m.to}</div>

\`\`\`${m.after.lang}
${m.after.code}
\`\`\`

</div>
</div>
${m.notes?.length ? `\n${m.notes.map((n) => `- ${n}`).join('\n')}\n` : ''}`,
  )
  return `\n## Migrate\n\n${blocks.join('\n')}`
}

/** A composite's doc: how to place/register the arrangement, plus the arrangement itself. */
function compositeDoc(item, manifest, source) {
  const deps = [...manifest.registryDependencies, ...manifest.dependencies]
  return `---
title: ${JSON.stringify(item.title)}
summary: ${JSON.stringify(item.description)}
category: component
component: ${item.name}
order: 100
---

**${item.title} is a composite**: a data arrangement of parts, not code. \`add\`
copies the arrangement JSON plus the source of every part it references.

## Add it

\`\`\`bash
npx @runek/cli add ${item.name}
\`\`\`
${deps.length ? `\nPulls ${deps.map((d) => `\`${d}\``).join(', ')}.\n` : ''}
## Use it

Place it in a world by type — the renderer expands the arrangement in place:

\`\`\`json
{ "type": "${item.title}", "props": { "position": [0, 0, 0], "seed": 1 } }
\`\`\`

Register the arrangement in your registry map next to the parts it uses:

\`\`\`ts
import ${item.name} from './runek/composites/${item.name}.json'

const registry = { /* …parts… */, ${item.title}: ${item.name} as unknown as CompositeDef }
\`\`\`

An instance \`seed\` deterministically re-rolls every child that doesn't pin its
own. In the editor, **Unpack** replaces an instance with its editable
arrangement (a \`Group\` of ordinary nodes) for per-instance customization.

## Arrangement

\`\`\`json
${source.trimEnd()}
\`\`\`
${migrateSection(item)}
## Registry manifest

<a class="manifest-card" href="${REGISTRY}/components/${item.name}.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/${item.name}.json</span>
<span class="manifest-card__hint">Self-contained JSON: the inlined arrangement plus resolved dependencies, exactly what <code>runek add ${item.name}</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
`
}
