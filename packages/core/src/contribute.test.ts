import { describe, expect, it } from 'vitest'
import { editFileUrl, forkUrl, type GitHubSource, parseGitHubSource } from './contribute'

describe('parseGitHubSource', () => {
  it('parses a github.com world source', () => {
    expect(
      parseGitHubSource({
        url: 'https://github.com/nullorder/helicon',
        path: 'public/helicon.world.json',
        branch: 'main',
      }),
    ).toEqual({
      owner: 'nullorder',
      repo: 'helicon',
      branch: 'main',
      path: 'public/helicon.world.json',
    })
  })

  it('defaults the branch to main and strips a .git suffix', () => {
    const gh = parseGitHubSource({ url: 'https://github.com/o/r.git' })
    expect(gh?.branch).toBe('main')
    expect(gh?.repo).toBe('r')
    expect(gh?.path).toBeUndefined()
  })

  it('returns null for non-github hosts', () => {
    expect(parseGitHubSource({ url: 'https://gitlab.com/o/r' })).toBeNull()
  })

  it('returns null for an unparseable or missing url', () => {
    expect(parseGitHubSource({ url: 'not a url' })).toBeNull()
    expect(parseGitHubSource(undefined)).toBeNull()
  })
})

describe('contribute urls', () => {
  const gh: GitHubSource = {
    owner: 'nullorder',
    repo: 'helicon',
    branch: 'main',
    path: 'public/helicon.world.json',
  }

  it('builds the fork url', () => {
    expect(forkUrl(gh)).toBe('https://github.com/nullorder/helicon/fork')
  })

  it('builds the edit-file url', () => {
    expect(editFileUrl(gh)).toBe(
      'https://github.com/nullorder/helicon/edit/main/public/helicon.world.json',
    )
  })

  it('has no edit-file url without a path', () => {
    expect(editFileUrl({ ...gh, path: undefined })).toBeNull()
  })
})
