// The city's shared light as TSL uniforms, for the tower and kit node materials. They read
// `towerLight` (city/towerLight.ts) each render, so the light a world sets reaches them without
// a write of their own.

import { uniform } from 'three/tsl'
import { towerLight as T } from '../city/towerLight'

export const towerNodeUniforms = {
  window: uniform(T.window),
  shop: uniform(T.shop),
  trim: uniform(T.trim).onRenderUpdate(() => T.trim),
  sign: uniform(T.sign),
  tube: uniform(T.tube),
  street: uniform(T.street),
  night: uniform(T.night).onRenderUpdate(() => T.night),
  wallGain: uniform(T.wallGain).onRenderUpdate(() => T.wallGain),
  glow: uniform(T.glow),
}
