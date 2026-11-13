// Tower's facade shader (WebGL). One material draws every wall of every tower from per-vertex
// data, so towers keep merging in Runek's static batcher.
//
// Coordinates are metres on the wall (`aUv`: along the face, and height above the base), never
// world position, because a merged tower's `position` is already in world space. Every edge is
// box-filtered over the pixel footprint (`fwidth`), and per-cell randomness fades to its mean
// once a cell is smaller than a pixel, so windows do not shimmer at distance.
//
// Bands (aRect.w): 0 plain trim, 1 street, 2 service, 3 podium, 4 tower, 5 crown, 6 roof.

import { glslLamp, glslLampTable, SHOP_LAMPS, WINDOW_LAMPS } from './towerLight'

export const TOWER_VERT = /* glsl */ `
attribute vec2 aUv;
attribute vec4 aRect;
attribute vec4 aCell;
attribute vec3 aWall;
attribute vec3 aTrim;
attribute vec4 aLook;
varying vec2 vUv;
varying vec3 vRay;
varying float vNy;
flat varying vec4 vRect;
flat varying vec4 vCell;
flat varying vec3 vWall;
flat varying vec3 vTrim;
flat varying vec4 vLook;
#include <fog_pars_vertex>
void main() {
  vUv = aUv; vRect = aRect; vCell = aCell; vWall = aWall; vTrim = aTrim; vLook = aLook;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  // The view ray in the wall's own frame: along the face, up, and into the wall.
  vec3 wn = normalize(mat3(modelMatrix) * normal);
  vec3 along = normalize(vec3(wn.z, 0.0, -wn.x) + vec3(1e-5, 0.0, 0.0));
  vec3 view = wp.xyz - cameraPosition;
  vRay = vec3(dot(view, along), view.y, -dot(view, wn));
  vNy = normal.y;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`

export const TOWER_FRAG = /* glsl */ `
uniform float uNight;
uniform vec2 uWindow;
uniform vec2 uShop;
uniform float uTrim;
uniform float uWallGain;
uniform vec3 uGlow;
varying vec2 vUv;
varying vec3 vRay;
varying float vNy;
flat varying vec4 vRect;
flat varying vec4 vCell;
flat varying vec3 vWall;
flat varying vec3 vTrim;
flat varying vec4 vLook;
#include <fog_pars_fragment>
uint pcg(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}
float h21(vec2 p) {
  uvec2 q = uvec2(ivec2(floor(p)) + 65536);
  return float(pcg(q.x * 1664525u + pcg(q.y))) * (1.0 / 4294967295.0);
}
float pulseInt(float x, float a, float b) { return floor(x) * (b - a) + clamp(fract(x), a, b) - a; }
// Box-filtered periodic pulse: coverage of [a, b] in each unit cell over a footprint w.
float pulse(float x, float a, float b, float w) {
  w = max(w, 1e-4);
  return (pulseInt(x + 0.5 * w, a, b) - pulseInt(x - 0.5 * w, a, b)) / w;
}
// Box-filtered single band [a, b].
float band(float x, float a, float b, float w) {
  return clamp((min(x + 0.5 * w, b) - max(x - 0.5 * w, a)) / max(w, 1e-4), 0.0, 1.0);
}
// A point along a ladder rung, spaced evenly on a log scale.
float rung(vec2 r, float t) { return r.x * pow(r.y / r.x, t); }
${glslLampTable('windowLamp', WINDOW_LAMPS)}
${glslLampTable('shopLamp', SHOP_LAMPS)}

// Interior mapping, flattened: the ray from the glass meets the back wall, a side wall, the
// ceiling or the floor of a box room, and each surface is one flat tone of the room's lamp.
// kind 0 plain room, 1 shelves on the back wall, 2 a shop (stocked shelves over a counter, a back door).
vec3 room(vec3 ro, vec3 rd, vec3 size, float seed, float kind) {
  rd.z = max(rd.z, 0.02);
  rd.xy += vec2(1e-4);
  vec3 t = (step(0.0, rd) * size - ro) / rd;
  float tm = min(min(t.x, t.y), t.z);
  vec3 p = ro + rd * tm;
  float r1 = fract(seed * 7.31), r2 = fract(seed * 3.17);
  float tone;
  if (tm == t.z) {
    tone = 1.0;
    if (kind > 1.5) {
      // A shop: stocked shelves over a counter, and a dark doorway to the back room.
      vec2 q = vec2(p.x * 3.2, p.y * 2.1);
      vec2 qc = floor(q), qf = fract(q);
      float top = 0.35 + 0.55 * h21(qc + vec2(seed * 91.0, 3.0));
      float stock = step(0.12, qf.y) * step(qf.y, top) * step(0.08, qf.x) * step(0.3, h21(qc + vec2(7.0, seed * 37.0)));
      float zone = step(size.y * 0.36, p.y) * step(p.y, size.y * 0.9);
      float door = step(abs(p.x - size.x * (0.2 + 0.6 * r1)), 0.5) * step(p.y, 2.1);
      tone = mix(tone, 0.55, step(qf.y, 0.12) * zone);
      tone = mix(tone, mix(0.38, 0.8, h21(qc + vec2(seed * 13.0, 11.0))), stock * zone);
      tone = mix(tone, 0.3, step(p.y, size.y * 0.3));
      tone = mix(tone, 0.2, door);
    } else {
      float furniture = step(p.y, size.y * (0.24 + 0.2 * r2)) * step(abs(p.x - size.x * (0.25 + 0.5 * r1)), size.x * 0.22);
      float shelves = step(0.55, fract(p.y * 2.3)) * step(p.y, size.y * 0.85) * step(0.5, kind);
      tone = mix(tone, 0.62, shelves);
      tone = mix(tone, 0.2, furniture);
    }
  } else if (tm == t.y) {
    tone = rd.y > 0.0 ? 1.3 : 0.42;
  } else {
    // Side walls: a shop's counter and shelf boards run round them.
    tone = 0.62;
    float shop = step(1.5, kind);
    tone = mix(tone, 0.48, shop * step(fract(p.y * 2.1), 0.12) * step(size.y * 0.36, p.y) * step(p.y, size.y * 0.9));
    tone = mix(tone, 0.34, shop * step(p.y, size.y * 0.3));
  }
  return vec3(tone, tm, 0.0);
}

void main() {
  float kind = vRect.w, faceW = vRect.x, y0 = vRect.y, y1 = vRect.z;
  float sd = vLook.x, era = vLook.y, fseed = vLook.z, flags = vLook.w;
  float strips = mod(flags, 2.0), roofline = mod(floor(flags * 0.5), 2.0), fasciaTube = mod(floor(flags * 0.25), 2.0);
  vec2 m = vUv;
  vec2 fw = fwidth(m);
  vec3 wall = vWall * mix(0.35, uWallGain, uNight);
  vec3 trim = vTrim * uTrim * uNight;
  vec3 col = wall;

  if (kind > 5.5) {
    // Roof: darker, patched, with the trim color along its edges after dusk.
    vec2 ed = min(m, vRect.xy - m);
    float patchy = mix(0.5, 0.68, h21(floor(m / 2.4) + sd));
    patchy = mix(0.6, patchy, clamp(1.0 - max(fw.x, fw.y) / 2.4, 0.0, 1.0));
    col = wall * patchy;
    col += trim * roofline * (1.0 - band(min(ed.x, ed.y), 0.35, 1e4, max(fw.x, fw.y)));
  } else if (kind < 0.5) {
    // Plain trim: slabs, cornices, parapets, rooftop boxes. Shaded by which way the face points.
    col = wall * (vNy > 0.5 ? 0.75 : (vNy < -0.5 ? 0.4 : 1.0));
    col += trim * roofline * band(m.y, y1 - 0.4, y1 - 0.12, fw.y) * step(abs(vNy), 0.5);
    col += uGlow * exp(-max(m.y, 0.0) / 6.0) * uNight * step(abs(vNy), 0.5);
  } else {
    float lit = 0.0;
    vec3 emit = vec3(0.0);
    // How far a pixel is from the camera in cells decides the level of detail.
    if (kind < 1.5) {
      // Street: shop bays between piers under a fascia. vCell = (bay width, 2 bits per bay).
      float bayW = vCell.x;
      float sg = m.x / bayW;
      float bi = floor(sg);
      float xm = fract(sg) * bayW;
      float state = mod(floor(vCell.y / exp2(2.0 * bi) + 0.01), 4.0);
      float r = h21(vec2(bi, sd * 13.1 + fseed));
      float lod = clamp(fw.x / bayW * 3.0 - 0.5, 0.0, 1.0);
      float open = band(xm, 0.38, bayW - 0.38, fw.x) * band(m.y, 0.38, 3.3, fw.y);
      float frame = band(xm, 0.3, bayW - 0.3, fw.x) * band(m.y, 0.3, 3.38, fw.y) - open;
      float fascia = band(m.y, 3.5, 4.38, fw.y);
      float plinth = band(m.y, 0.0, 0.3, fw.y);
      col = mix(col, wall * 0.55, fascia);
      col = mix(col, wall * 0.7, plinth);
      col = mix(col, wall * 0.4, frame);
      vec3 lamp = shopLamp(r * ${SHOP_LAMPS[SHOP_LAMPS.length - 1][0].toFixed(3)}) * rung(uShop, h21(vec2(bi + 3.0, sd + fseed * 5.0))) * mix(0.08, 1.0, uNight);
      if (state < 0.5) {
        // Open and lit. Mullions split the glass in three, a door takes one third.
        float third = bayW - 0.76;
        float mull = pulse((xm - 0.38) / third * 3.0, 0.0, 0.06, fw.x / third * 3.0) + band(m.y, 2.55, 2.63, fw.y);
        float counter = band(m.y, 0.38, 1.05, fw.y);
        float flatTone = (0.62 + 0.38 * smoothstep(0.3, 3.3, m.y)) * mix(1.0, 0.35, counter);
        vec3 rm = room(vec3(xm - 0.38, m.y - 0.38, 0.0), vRay, vec3(third, 2.92, 3.6), r + fseed, 2.0);
        float near = 1.0 - smoothstep(0.05, 0.22, max(fw.x, fw.y));
        float tone = mix(flatTone, rm.x, near);
        vec3 shop = lamp * tone;
        shop = mix(shop, wall * 0.35, clamp(mull, 0.0, 1.0));
        col = mix(col, shop, open);
        // The fascia tube sits over lit bays only, so the light gathers where the shops are.
        emit += trim * fasciaTube * band(m.y, 3.42, 3.5, fw.y) * band(xm, 0.2, bayW - 0.2, fw.x);
      } else if (state < 1.5) {
        // Shutter down: slats, a housing box, a strip of light under the door.
        float slat = pulse(m.y / 0.12, 0.0, 0.68, fw.y / 0.12);
        vec3 shutter = wall * mix(0.9, 1.9, h21(vec2(bi + 11.0, sd))) * mix(0.6, 1.0, slat);
        shutter = mix(shutter, wall * 0.5, band(m.y, 3.05, 3.3, fw.y));
        col = mix(col, shutter, open);
        // Posters pasted across it.
        vec2 pg = vec2((xm - 0.5) / 0.74, (m.y - 0.9) / 1.05);
        vec2 pc = floor(pg), pf = fract(pg);
        float pr = h21(pc + vec2(bi * 7.0 + sd, fseed + 41.0));
        float on = step(pr, 0.36) * step(0.0, pc.y) * step(pc.y, 1.0) * step(0.0, pg.x) * step(pc.x + 1.0, (bayW - 1.0) / 0.74);
        float paper = pulse(pg.x, 0.06, 0.94, fw.x / 0.74) * pulse(pg.y, 0.05, 0.95, fw.y / 1.05) * on * (1.0 - lod);
        vec3 ink = mix(mix(vec3(0.5, 0.42, 0.3), vec3(0.42, 0.2, 0.12), step(0.12, pr)), vec3(0.24, 0.2, 0.34), step(0.25, pr));
        ink *= mix(1.0, 0.35, step(0.72, pf.y)) * mix(1.0, 0.6, step(pf.y, 0.4) * step(0.5, fract(pf.y * 12.0)));
        col = mix(col, ink * mix(0.35, uWallGain, uNight) * 1.6, paper * open);
      } else if (state < 2.5) {
        // Closed for the night: dark glass holding a little haze, a dim lamp left on at the back.
        vec3 glass = vec3(0.010, 0.009, 0.008) + vec3(0.02, 0.012, 0.007) * (1.0 - m.y / 3.3);
        glass += lamp * 0.035 * band(m.y, 2.2, 3.1, fw.y);
        col = mix(col, glass * mix(8.0, 1.0, uNight), open);
      } else {
        // A blank wall with a door, a lit transom over it and a bill or two beside it.
        float door = band(xm, bayW * 0.5 - 0.62, bayW * 0.5 + 0.62, fw.x);
        col = mix(col, wall * 0.42, door * band(m.y, 0.0, 2.3, fw.y));
        emit += lamp * 0.5 * door * band(m.y, 2.38, 2.7, fw.y);
        float bill = band(xm, 0.6, 1.3, fw.x) * band(m.y, 1.1, 2.05, fw.y) * step(0.4, r) * (1.0 - lod);
        col = mix(col, vec3(0.5, 0.42, 0.3) * mix(0.35, uWallGain, uNight) * 1.5 * mix(1.0, 0.4, step(1.8, m.y)), bill);
      }
    } else if (kind < 2.5) {
      // Service: louvre panels between joints, a conduit along the bottom.
      float slat = pulse(m.y / 0.16, 0.0, 0.55, fw.y / 0.16);
      float panel = pulse(m.x / 2.4, 0.03, 0.97, fw.x / 2.4);
      col = wall * mix(0.45, 0.8, slat) * mix(0.5, 1.0, panel);
      col = mix(col, wall * 1.3, band(m.y, y0 + 0.05, y0 + 0.13, fw.y));
    } else {
      // Windows. vCell = (cell width, storey height, lit share, style).
      float cw = vCell.x, ch = vCell.y, litP = vCell.z, style = vCell.w;
      vec2 g = vec2(m.x / cw, (m.y - y0) / ch);
      vec2 gw = fw / vec2(cw, ch);
      vec2 cell = floor(g), f = fract(g);
      float rows = floor((y1 - y0) / ch + 0.01);
      float inRows = band(g.y, 0.0, rows, gw.y);
      float lod = clamp(max(gw.x, gw.y) * 1.6 - 0.5, 0.0, 1.0);
      float r = h21(cell + vec2(sd * 31.7, fseed * 7.3));
      float r2 = h21(cell * 1.7 + vec2(sd, fseed + 9.1));
      vec4 w = style < 0.5 ? vec4(0.2, 0.8, 0.29, 0.76) : (style < 1.5 ? vec4(0.1, 0.9, 0.3, 0.8) : (style < 2.5 ? vec4(0.0, 1.0, 0.3, 0.74) : vec4(0.03, 0.97, 0.05, 0.95)));
      // The crown reads differently by era: slots on a concrete block, a lit band on a glass slab.
      if (kind > 4.5 && era < 0.5) w = vec4(0.38, 0.62, 0.12, 0.9);
      if (kind > 4.5 && era > 1.5 && era < 2.5) { w = vec4(0.02, 0.98, 0.1, 0.92); litP = 1.0; }
      float mask = pulse(g.x, w.x, w.y, gw.x) * pulse(g.y, w.z, w.w, gw.y) * inRows;
      float frameMask = pulse(g.x, w.x - 0.035, w.y + 0.035, gw.x) * pulse(g.y, w.z - 0.03, w.w + 0.03, gw.y) * inRows - mask;
      // Trims by band: a sill under each window row, a course line at each storey, piers at corners.
      float sill = pulse(g.y, w.z - 0.075, w.z - 0.03, gw.y) * pulse(g.x, w.x - 0.06, w.y + 0.06, gw.x) * inRows;
      float course = pulse(g.y, 0.0, 0.035, gw.y) * step(kind, 3.5);
      float fin = pulse(g.x, 0.0, 0.05, gw.x) * step(1.5, style);
      col = mix(col, wall * 0.62, clamp(frameMask, 0.0, 1.0));
      col = mix(col, wall * 1.45, sill * step(style, 1.5));
      col = mix(col, wall * 0.72, course);
      col = mix(col, wall * 1.35, fin);
      // Decal slots: one hash per wall cell picks a leak streak, a crack, a sticker or nothing.
      float d = h21(cell + vec2(77.0 + sd, 13.0 + fseed));
      float d2 = h21(cell + vec2(5.0 + fseed, 91.0 + sd));
      float calm = 1.0 - lod;
      float streakX = (f.x - mix(w.x, w.y, d2)) * cw;
      float leak = step(d, 0.14) * band(streakX, -0.06 - 0.1 * d2, 0.06 + 0.1 * d2, fw.x) * band(f.y, 0.0, w.z - 0.07, gw.y) * (0.35 + 0.65 * f.y / max(w.z, 0.05));
      float crackX = (f.x - 0.5 * (w.y + 1.0)) * cw + 0.05 * sin(f.y * 23.0 + d2 * 40.0) + 0.03 * sin(f.y * 61.0);
      float crack = step(0.14, d) * step(d, 0.2) * band(crackX, -0.012, 0.012, fw.x) * step(style, 1.5);
      float sticker = step(0.2, d) * step(d, 0.25) * band((f.x - w.y) * cw, 0.08, 0.36, fw.x) * band(f.y * ch, 0.5, 0.95, fw.y) * step(style, 1.5) * step(kind, 3.5);
      col = mix(col, wall * 0.5, clamp(leak + crack, 0.0, 1.0) * calm * inRows);
      col = mix(col, mix(vec3(0.5, 0.42, 0.3), vec3(0.24, 0.2, 0.34), step(0.225, d)) * mix(0.35, uWallGain, uNight) * 1.5, sticker * calm * inRows);
      // Grime under the band's top edge, in streaks.
      float drip = pulse(m.x / 1.9 + fseed * 0.37, 0.0, 0.16, fw.x / 1.9) * exp(-(y1 - m.y) / 2.2) * 0.45;
      col *= 1.0 - drip * step(style, 2.5);

      // Glass. Lit rooms sit on the window rung in their lamp's color.
      float on = step(1.0 - litP, r) * uNight;
      vec3 lampC = windowLamp(r2) * rung(uWindow, h21(cell + vec2(9.1, sd)));
      if (kind > 4.5 && era > 1.5 && era < 2.5) lampC = ${glslLamp('#f4f6fb')} * rung(uWindow, 0.9);
      if (style > 2.5) lampC *= 0.5;
      vec3 dark = mix(vec3(0.20, 0.24, 0.30), vec3(0.010, 0.009, 0.008) + vec3(0.012, 0.007, 0.004) * (1.0 - f.y), uNight);
      // Room types: a blind part way down, shelves on the back wall, a screen in a dark room.
      float blind = step(0.55, r2) * step(f.y, w.w) * step(mix(w.w, w.z, 0.25 + 0.6 * fract(r2 * 7.0)), f.y);
      float near = (1.0 - smoothstep(0.03, 0.11, max(gw.x, gw.y))) * step(style, 2.5);
      float tone = mix(0.7, 1.0, smoothstep(w.z, w.w, f.y));
      if (near > 0.0) {
        vec3 rm = room(vec3(f.x * cw, f.y * ch, 0.0), vRay, vec3(cw, ch, 3.6), r + r2, step(0.7, fract(r2 * 3.0)));
        tone = mix(tone, rm.x, near);
      }
      tone = mix(tone, 0.55, blind);
      vec3 glassLit = lampC * tone;
      float screen = step(0.93, fract(r * 5.3)) * (1.0 - step(1.0 - litP, r)) * band(f.x, mix(w.x, w.y, 0.3), mix(w.x, w.y, 0.62), gw.x) * band(f.y, mix(w.z, w.w, 0.2), mix(w.z, w.w, 0.55), gw.y);
      vec3 cellGlass = mix(dark, glassLit, on) + ${glslLamp('#b967ff')} * uWindow.x * 0.5 * screen * uNight;
      // Past a pixel per cell the pattern becomes its own mean.
      vec3 meanGlass = mix(dark, ${glslLamp('#ffcf9a')} * rung(uWindow, 0.5) * 0.8 * (style > 2.5 ? 0.5 : 1.0), litP * uNight);
      col = mix(col, mix(cellGlass, meanGlass, lod), mask);
      // Mullions and a transom split each pane, so a lit window never reads as one flat block.
      float nx = style < 0.5 ? 2.0 : (style < 1.5 ? 1.0 : (style < 2.5 ? 3.0 : 2.0));
      float mw = 0.07 * nx / cw;
      float mull = pulse(g.x * nx + 0.5 * mw, 0.0, mw, gw.x * nx);
      float ty = mix(w.z, w.w, style < 0.5 ? 0.66 : (style < 2.5 ? 0.3 : 0.5));
      float transom = band(f.y, ty, ty + 0.06 / ch, gw.y) * inRows;
      col = mix(col, wall * 0.45, clamp(mull + transom, 0.0, 1.0) * mask * step(kind, 4.5));
      // Concrete blocks wash their crown with sodium floods.
      if (kind > 4.5 && era < 0.5) emit += ${glslLamp('#ff9326')} * uWindow.x * 0.6 * uNight * (1.0 - mask) * smoothstep(y1, y0, m.y);
      emit += trim * roofline * band(m.y, y1 - 0.45, y1 - 0.1, fw.y);
    }
    // Band edges: a coping line on top, a shadow line below.
    col = mix(col, wall * 1.4, band(m.y, y1 - 0.14, y1, fw.y) * step(1.5, kind));
    emit += trim * 0.85 * strips * band(min(m.x, faceW - m.x), 0.0, 0.22, fw.x) * step(2.5, kind);
    // Street light (lamps, signs, shop glass) on the lowest floors.
    col += uGlow * exp(-m.y / 6.0) * uNight;
    col += emit;
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`
