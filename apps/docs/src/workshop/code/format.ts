const SHORT_ARRAY =
  /\[\s*(?:-?[\d.eE+-]+|true|false|null|"[^"\n]{0,24}")(?:,\s*(?:-?[\d.eE+-]+|true|false|null|"[^"\n]{0,24}"))*\s*\]/g

/** Keep vectors and other short lists on one line: `[1, 0, 2]`. */
export const compactArrays = (text: string) =>
  text.replace(SHORT_ARRAY, (match) => {
    try {
      const items = JSON.parse(match) as unknown[]
      return items.length <= 8 ? `[${items.map((i) => JSON.stringify(i)).join(', ')}]` : match
    } catch {
      return match
    }
  })
