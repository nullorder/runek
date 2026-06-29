#!/usr/bin/env node
// Generate a Markdown doc per component from the registry, so /docs covers the
// whole catalog and stays in sync with the source. Re-run after `just registry`.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const registryDir = join(root, 'registry')
const outDir = join(root, 'apps/docs/src/content/docs/components')

const index = JSON.parse(readFileSync(join(registryDir, 'registry.json'), 'utf8'))
const components = index.items.filter((i) => i.type === 'registry:component')

// Where the registry is served (the CLI's default base).
const REGISTRY = 'https://runek.nullorder.org/r'

mkdirSync(outDir, { recursive: true })

for (const item of components) {
  const manifest = JSON.parse(
    readFileSync(join(registryDir, 'components', `${item.name}.json`), 'utf8'),
  )
  const source = manifest.files[0]?.content ?? ''
  const propsMatch = source.match(/export interface \w*Props \{[\s\S]*?\n\}/)
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
${propsMatch ? `\n## Props\n\n\`\`\`ts\n${propsMatch[0]}\n\`\`\`\n` : ''}
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
