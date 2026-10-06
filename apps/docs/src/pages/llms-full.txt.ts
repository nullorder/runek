import type { APIRoute } from 'astro'
import { docBody, pageUrl, SITE, sortedDocs } from '../lib/markdown'

export const GET: APIRoute = async () => {
  const docs = (await sortedDocs()).filter((d) => d.id !== 'changelog')
  const sections = docs.map(
    (d) =>
      `# ${d.data.title}\n\nSource: ${pageUrl(d.id)}${d.data.summary ? `\n\n> ${d.data.summary}` : ''}\n\n${docBody(d)}`,
  )
  const text = `# Runek docs (full)

Every page of ${SITE}/docs as one Markdown file: guides first, then every component. The index is ${SITE}/llms.txt; the changelog is ${SITE}/docs/changelog.md.

${sections.join('\n\n---\n\n')}
`
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
