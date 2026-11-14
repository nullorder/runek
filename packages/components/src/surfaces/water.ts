// The water shaders' swell in plain TS: the same wave the GLSL and node materials draw, so a
// swimmer rides the surface that is on screen.

/** Wave frequencies (first wave x and y, second wave x and y, the diagonal chop) and how fast the
 *  chop runs against the clock: the numbers a water shader is written with. */
export interface Swell {
  freq: [number, number, number, number, number]
  chop: number
}

/** Height of the swell at (x, y) of the water's wave coordinates at wave time `t`, for a wave
 *  height of 1. Mirrors `waveH` in `Lake` and `Ocean`. */
export function swellAt({ freq, chop }: Swell, x: number, y: number, t: number) {
  const w1 = Math.sin(x * freq[0] + t) * Math.cos(y * freq[1] + t * 0.8)
  const w2 = Math.sin(x * freq[2] - t * 0.7) * Math.sin(y * freq[3] + t)
  const w3 = Math.sin((x + y) * freq[4] + t * chop) * 0.25
  return (w1 + w2 + w3) * 0.5
}
