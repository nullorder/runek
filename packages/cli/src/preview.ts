// `runek preview`: a workshop link that carries the world in its hash, encoded exactly like the
// workshop's own share links (deflate-raw JSON, base64url, `#s=`).
import { deflateRawSync } from 'node:zlib'

export const SITE = 'https://runek.nullorder.org'
/** Beyond this many characters a link gets unwieldy (the workshop's own threshold). */
export const SHARE_SOFT_LIMIT = 8000

export function encodeShare(world: unknown): string {
  return deflateRawSync(Buffer.from(JSON.stringify({ v: 1, world }))).toString('base64url')
}

/** A Runek site serves its registry at `<site>/r`; anything else previews on the public site. */
export function siteOrigin(registry: string): string {
  const match = registry.match(/^(https?:\/\/.+?)\/r\/?$/)
  return match ? match[1] : SITE
}

export function previewUrl(world: unknown, registry: string): string {
  return `${siteOrigin(registry)}/workshop#s=${encodeShare(world)}`
}
