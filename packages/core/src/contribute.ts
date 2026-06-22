import type { WorldSource } from './world-data'

/** A GitHub-hosted world source, parsed into the pieces the contribute URLs need. */
export interface GitHubSource {
  owner: string
  repo: string
  branch: string
  path?: string
}

/**
 * Parse a `WorldSource` into its GitHub owner/repo (plus branch + path), or `null`
 * if the source is not a github.com URL. `meta.source` stores the full web URL
 * precisely so the host is detectable here; non-GitHub hosts fall back to "open the
 * repo" in the UI.
 */
export function parseGitHubSource(source: WorldSource | undefined): GitHubSource | null {
  if (!source?.url) return null
  let url: URL
  try {
    url = new URL(source.url)
  } catch {
    return null
  }
  if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') return null
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length < 2) return null
  return {
    owner: parts[0],
    repo: parts[1].replace(/\.git$/, ''),
    branch: source.branch?.trim() || 'main',
    path: source.path?.trim() || undefined,
  }
}

/** URL that forks the world's repo on GitHub. */
export function forkUrl(gh: GitHubSource): string {
  return `https://github.com/${gh.owner}/${gh.repo}/fork`
}

/**
 * GitHub web edit-file URL. Opening it as a non-collaborator makes GitHub auto-fork
 * the repo and open its web editor on the fork — the zero-auth contribution path.
 * Returns `null` when the world's file path is unknown (nothing to deep-link).
 */
export function editFileUrl(gh: GitHubSource): string | null {
  if (!gh.path) return null
  return `https://github.com/${gh.owner}/${gh.repo}/edit/${gh.branch}/${gh.path}`
}
