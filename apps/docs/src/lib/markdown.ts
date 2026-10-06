// Plain-Markdown views of the docs for agents and LLM tools: /docs/<slug>.md, /llms.txt and
// /llms-full.txt. Server-only.
import { type CollectionEntry, getCollection } from 'astro:content'
import changelog from '../../../../CHANGELOG.md?raw'

export const SITE = 'https://runek.nullorder.org'

type Doc = CollectionEntry<'docs'>

const CATEGORY_ORDER = ['intro', 'guide', 'reference', 'component'] as const

export async function sortedDocs(): Promise<Doc[]> {
  return (await getCollection('docs')).sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.data.category) - CATEGORY_ORDER.indexOf(b.data.category) ||
      a.data.order - b.data.order ||
      a.data.title.localeCompare(b.data.title),
  )
}

export const pageUrl = (id: string) => `${SITE}/docs/${id}`
export const markdownUrl = (id: string) => `${SITE}/docs/${id}.md`

/** The page's Markdown, with site-only HTML turned back into plain Markdown and every
 *  link made absolute (doc links point at their `.md` twin). */
export function docBody(doc: Doc): string {
  const raw = doc.id === 'changelog' ? changelog.replace(/^# .*\n+/, '') : (doc.body ?? '')
  return raw
    .replace(
      /<a class="manifest-card" href="([^"]+)">[\s\S]*?<span class="manifest-card__hint">([\s\S]*?)<\/span>\s*<\/a>/g,
      (_, href: string, hint: string) => `[${href}](${href}): ${hint.replace(/<\/?code>/g, '`')}`,
    )
    .replace(/^<div class="migration__tag">(.*?)<\/div>$/gm, '**$1**')
    .replace(/^<\/?div[^>]*>\n/gm, '')
    .replace(/\]\(\/docs\/([^)#\s]+)(#[^)\s]*)?\)/g, (_, id: string, hash = '') => {
      return `](${markdownUrl(id)}${hash})`
    })
    .replace(/\]\(\/(?!\/)/g, `](${SITE}/`)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function docMarkdown(doc: Doc): string {
  const summary = doc.data.summary ? `\n\n> ${doc.data.summary}` : ''
  return `# ${doc.data.title}${summary}\n\n${docBody(doc)}\n`
}
