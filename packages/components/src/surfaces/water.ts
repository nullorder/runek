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

/**
 * GLSL for a water surface seen from below, for a fragment shader that declares `uColorDeep`,
 * `uColorShallow`, `uSunDir`, `uFogNear` and `uFogFar` first. From below the surface is a layer
 * over what lies past it: the sky's light through a window straight overhead (light from above
 * enters the water no flatter than 49 degrees from straight down), a shade of the deep water
 * past that, and nothing at all by the distance the water's fog closes at, so it melts into
 * whatever stands for the water beyond (`Underwater`'s backdrop). `n` is the surface's normal up
 * out of the water, `viewDir` runs from the surface to the camera, `m` is the wave's height from
 * 0 to 1, `far` how far off the surface is. Returns the color and how much of it shows.
 */
export const UNDERSIDE = /* glsl */ `
  vec4 underside(vec3 n, vec3 viewDir, float m, float far) {
    float window = smoothstep(0.6, 0.8, max(dot(-viewDir, n), 0.0));
    vec3 col = mix(uColorDeep * 0.5, mix(uColorShallow, vec3(0.62, 0.78, 0.9), 0.7), window);
    col *= 0.9 + 0.2 * m;
    // The sun, where its light comes down through the surface.
    float sun = pow(max(dot(viewDir, refract(-uSunDir, n, 0.75)), 0.0), 60.0);
    col += vec3(1.0, 0.95, 0.85) * sun * 0.7;
    float alpha = mix(0.4, 0.8, window) + sun * 0.2;
    return vec4(col, min(alpha, 1.0) * (1.0 - smoothstep(uFogNear, uFogFar, far)));
  }
`
