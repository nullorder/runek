import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

// Single source of truth for the docs: one Markdown file per topic/component,
// rendered two ways — these flat pages (SEO/a11y) and books in the 3D library.
const docs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    summary: z.string().optional(),
    category: z.enum(['intro', 'guide', 'component', 'reference']).default('guide'),
    order: z.number().default(100),
    // Registry name of the component this doc describes (drives the live preview
    // and which shelf/book it becomes in the world).
    component: z.string().optional(),
  }),
})

export const collections = { docs }
