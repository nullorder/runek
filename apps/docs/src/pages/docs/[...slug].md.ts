import type { APIRoute, GetStaticPaths } from 'astro'
import { docMarkdown, sortedDocs } from '../../lib/markdown'

export const getStaticPaths = (async () =>
  (await sortedDocs()).map((doc) => ({
    params: { slug: doc.id },
    props: { doc },
  }))) satisfies GetStaticPaths

export const GET: APIRoute = ({ props }) =>
  new Response(docMarkdown(props.doc), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
