// `runek --version` in Pixelspace, the docs site's display font. The 5×7 glyphs are traced from
// its outlines and cover "runek v<semver>", including alpha / beta / rc tags.
const GLYPHS: Record<string, string[]> = {
  r: ['     ', '     ', '# ###', '##   ', '#    ', '#    ', '#    '],
  u: ['     ', '     ', '#   #', '#   #', '#   #', '#   #', ' ### '],
  n: ['     ', '     ', ' ### ', '#   #', '#   #', '#   #', '#   #'],
  e: ['     ', '     ', ' ### ', '#   #', '#####', '#    ', ' ### '],
  k: ['#    ', '#    ', '#  # ', '# #  ', '##   ', '# #  ', '#  # '],
  v: ['     ', '     ', '#   #', '#   #', '#   #', ' # # ', '  #  '],
  a: ['     ', '     ', ' ### ', '    #', ' ####', '#   #', ' ####'],
  l: [' ##  ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', ' ### '],
  p: ['     ', '     ', '#### ', '#   #', '#### ', '#    ', '#    '],
  h: ['#    ', '#    ', '#### ', '#   #', '#   #', '#   #', '#   #'],
  b: ['#    ', '#    ', '#### ', '#   #', '#   #', '#   #', '#### '],
  t: ['  #  ', '  #  ', ' ### ', '  #  ', '  #  ', '  #  ', '   ##'],
  c: ['     ', '     ', ' ### ', '#    ', '#    ', '#    ', ' ### '],
  '0': [' ### ', '#   #', '#  ##', '# # #', '##  #', '#   #', ' ### '],
  '1': ['  #  ', ' ##  ', '  #  ', '  #  ', '  #  ', '  #  ', ' ### '],
  '2': [' ### ', '#   #', '    #', '   # ', '  #  ', ' #   ', '#####'],
  '3': [' ### ', '#   #', '    #', '  ## ', '    #', '#   #', ' ### '],
  '4': ['   # ', '  ## ', ' # # ', '#  # ', '#####', '   # ', '   # '],
  '5': ['#####', '#    ', '#### ', '    #', '    #', '#   #', ' ### '],
  '6': ['  ## ', ' #   ', '#    ', '#### ', '#   #', '#   #', ' ### '],
  '7': ['#####', '    #', '   # ', '  #  ', ' #   ', ' #   ', ' #   '],
  '8': [' ### ', '#   #', '#   #', ' ### ', '#   #', '#   #', ' ### '],
  '9': [' ### ', '#   #', '#   #', ' ####', '    #', '    #', ' ### '],
  '.': [' ', ' ', ' ', ' ', ' ', ' ', '#'],
  '-': ['   ', '   ', '   ', '###', '   ', '   ', '   '],
  ' ': ['  ', '  ', '  ', '  ', '  ', '  ', '  '],
}

/** `text` as pixel rows folded into half blocks (two pixel rows per line, so pixels stay
 *  square), or `null` when a character has no glyph. */
export function pixelText(text: string): string[] | null {
  const glyphs = [...text].map((ch) => GLYPHS[ch])
  if (glyphs.some((g) => !g)) return null
  const rows = Array.from({ length: 8 }, (_, r) =>
    glyphs.map((g) => g[r] ?? ' '.repeat(g[0].length)).join(' '),
  )
  const lines: string[] = []
  for (let r = 0; r < rows.length; r += 2) {
    let line = ''
    for (let c = 0; c < rows[r].length; c++) {
      const top = rows[r][c] === '#'
      const bottom = rows[r + 1][c] === '#'
      line += top && bottom ? '█' : top ? '▀' : bottom ? '▄' : ' '
    }
    lines.push(line.trimEnd())
  }
  return lines
}

export type Terminal = { tty: boolean; columns?: number; color: boolean }

/** The plain version for pipes and scripts; the pixel banner in a terminal wide enough for it. */
export function versionOutput(version: string, term: Terminal): string {
  if (!term.tty) return `${version}\n`
  const lines = pixelText(`runek v${version}`)
  const width = lines ? Math.max(...lines.map((l) => l.length)) + 2 : 0
  if (!lines || width > (term.columns ?? 80)) return `runek v${version}\n`
  const paint = term.color ? (s: string) => `\x1b[38;2;61;245;138m${s}\x1b[0m` : (s: string) => s
  return `\n${lines.map((l) => `  ${paint(l)}`).join('\n')}\n\n`
}
