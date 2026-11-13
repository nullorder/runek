// Font files a component draws its own lettering from (a neon tube, a billboard), loaded once
// each under a family name of their own. The files are the world's declared fonts (contract §4):
// nothing here ships a font.

const families = new Map<string, Promise<string | null>>()

/** Loads a font file and gives back the CSS family name it now has, or null if it would not load. */
export function fontFamily(url: string): Promise<string | null> {
  let asked = families.get(url)
  if (!asked) {
    const name = `runek-face-${families.size}`
    asked =
      typeof FontFace === 'undefined' || typeof document === 'undefined'
        ? Promise.resolve(null)
        : new FontFace(name, `url(${url})`).load().then(
            (f) => {
              ;(document.fonts as unknown as { add(face: FontFace): void }).add(f)
              return `"${name}"`
            },
            () => null,
          )
    families.set(url, asked)
  }
  return asked
}
