#!/usr/bin/env node
// Render-performance check for the docs library world.
//
// Serves the built docs site (apps/docs/dist), opens /library?perf in headless Chrome, and
// measures three scenarios: standing at the spawn, facing the gallery hall, and turning a
// full circle. Per frame it counts draw calls, full-scene passes (every time the world is
// rendered again: lens views, rift views), shadow passes, active point/spot lights, shadow
// casters, material instances and render-target allocations, then checks them against
// scripts/perf-budget.json.
// These counts don't depend on the machine, so CI enforces them. Frame times are reported
// always but only enforced with --timing (a real GPU, not CI's software renderer).
//
// Usage: node scripts/perf.mjs [update] [--timing] [--scale N] [--software | --gpu] [--json out.json] [--url …]
//   update      also measure at pixel densities 1, 1.5 and 2 and save this machine's results to
//               apps/docs/src/data/perf/ for the docs performance page and the landing page
//   --timing    also fail on the budget's minimum fps
//   --scale     device pixel ratio to emulate (default 2, a Retina laptop; CI uses 1)
//   --software  render on the CPU (SwiftShader) as CI does; the default on Linux
//   --gpu       render on the GPU on Linux
//   --url       measure a running site instead of serving apps/docs/dist
//   --json      write the measurements to a file
import { execFileSync, spawn } from 'node:child_process'
import {
  createReadStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { createServer } from 'node:http'
import { cpus, release, tmpdir, totalmem } from 'node:os'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const budget = JSON.parse(readFileSync(join(root, 'scripts/perf-budget.json'), 'utf8'))

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const timing = flag('timing')
const update = args.includes('update')
const scale = Number(option('scale', 2))
const software = flag('software') || (process.platform === 'linux' && !flag('gpu'))
// Pinned at what `<World>`'s default range would pick, so adaptive resolution can't move timings.
const dpr = Math.min(scale, 1.5)
const WIDTH = 1600
const HEIGHT = 900
// The pixel densities `update` measures; the budget is checked at `dpr` only.
const UPDATE_DPRS = [1, 1.5, 2]

if (update && software) {
  console.error(
    '✗ update needs a real GPU: software-rendered fps would mislead (Linux: pass --gpu)',
  )
  process.exit(1)
}

// Facing -x, through the library's west doorway into the gallery hall.
const SCENARIOS = [
  { name: 'spawn', query: '' },
  { name: 'gallery', query: '&yaw=-1.5708' },
  { name: 'turn', query: '', turn: true },
]
const SETTLE_MS = 6000
const MEASURE_MS = 4000
const MIN_FRAMES = 12

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function serve(dir) {
  const types = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf',
    '.woff2': 'font/woff2',
    '.wasm': 'application/wasm',
  }
  const server = createServer((req, res) => {
    let path = join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname))
    if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html')
    if (!existsSync(path)) {
      res.writeHead(404).end()
      return
    }
    res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' })
    createReadStream(path).pipe(res)
  })
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })),
  )
}

function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ]
  const found = candidates.find((p) => p && existsSync(p))
  if (!found) throw new Error('Chrome not found: set CHROME_PATH')
  return found
}

// A real GPU unless --software (CI runners have no GPU); Metal on macOS, Chrome's default backend elsewhere.
const GPU_FLAGS = software
  ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  : [
      ...(process.platform === 'darwin' ? ['--use-angle=metal'] : []),
      '--enable-gpu',
      '--ignore-gpu-blocklist',
    ]

// Each run's throwaway Chrome profile, removed when its Chrome closes (a few dozen MB apiece).
const profiles = new Set()
const browsers = new Set()
const removeProfile = (dir) => {
  rmSync(dir, { recursive: true, force: true })
  profiles.delete(dir)
}
// If the script dies mid-run, still don't leave profiles behind.
process.on('exit', () => {
  for (const chrome of browsers) chrome.kill('SIGKILL')
  for (const dir of profiles) removeProfile(dir)
})

async function launch(port) {
  const profile = mkdtempSync(join(tmpdir(), 'runek-perf-'))
  profiles.add(profile)
  const chrome = spawn(chromePath(), [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    ...GPU_FLAGS,
    `--window-size=${WIDTH},${HEIGHT}`,
    `--force-device-scale-factor=${scale}`,
    // Uncapped, so fps shows headroom rather than stopping at the display's refresh rate.
    '--disable-gpu-vsync',
    '--disable-frame-rate-limit',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--no-first-run',
    'about:blank',
  ])
  browsers.add(chrome)
  chrome.once('exit', () => browsers.delete(chrome))
  let ws
  for (let i = 0; i < 100 && !ws; i++) {
    await sleep(200)
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
      const page = targets.find((t) => t.type === 'page')
      if (page) ws = new WebSocket(page.webSocketDebuggerUrl)
    } catch {}
  }
  if (!ws) throw new Error('Chrome did not start')
  await new Promise((r) => ws.addEventListener('open', r))
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data)
    pending.get(msg.id)?.(msg)
    pending.delete(msg.id)
  })
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const i = ++id
      pending.set(i, resolve)
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (r.result?.exceptionDetails)
      throw new Error(r.result.exceptionDetails.exception?.description)
    return r.result?.result?.value
  }
  const key = (type) =>
    send('Input.dispatchKeyEvent', {
      type,
      code: 'ArrowRight',
      key: 'ArrowRight',
      windowsVirtualKeyCode: 39,
    })
  const click = async (x, y) => {
    for (const type of ['mousePressed', 'mouseReleased'])
      await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 })
  }
  const close = async () => {
    ws.close()
    // Wait for Chrome to let go of the profile before removing it (unless it already exited).
    if (chrome.exitCode === null && chrome.signalCode === null) {
      const exited = new Promise((resolve) => chrome.once('exit', resolve))
      chrome.kill()
      await exited
    }
    removeProfile(profile)
  }
  return { send, evaluate, key, click, close }
}

// Installed before any page script: counts draws and render-target allocations per frame.
const INSTRUMENT = `(() => {
  const P = (window.__perfFrames = { frames: [], firstDraw: null, allocs: 0 })
  const cur = { draws: 0, passes: 0, shadows: 0 }
  const gl = WebGL2RenderingContext.prototype
  for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) {
    const o = gl[k]
    gl[k] = function (...a) { cur.draws++; if (P.firstDraw === null) P.firstDraw = performance.now(); return o.apply(this, a) }
  }
  for (const k of ['renderbufferStorage', 'renderbufferStorageMultisample']) {
    const o = gl[k]
    gl[k] = function (...a) { P.allocs++; return o.apply(this, a) }
  }
  const raf = window.requestAnimationFrame.bind(window)
  let busy = 0
  window.requestAnimationFrame = (cb) => raf((t) => { const s = performance.now(); try { cb(t) } finally { busy += performance.now() - s } })
  P.hook = (state) => {
    const r = state.gl, render = r.render.bind(r), shadow = r.shadowMap.render.bind(r.shadowMap)
    r.render = (scene, camera) => { if (scene === state.scene) cur.passes++; return render(scene, camera) }
    r.shadowMap.render = (...a) => { const d = cur.draws; shadow(...a); if (cur.draws > d) cur.shadows++ }
  }
  let last = null
  const tick = (t) => {
    if (last !== null) P.frames.push({ ms: t - last, js: busy, ...cur })
    last = t; busy = 0; cur.draws = 0; cur.passes = 0; cur.shadows = 0
    raf(tick)
  }
  raf(tick)
})()`

const SCENE_STATS = `(() => {
  const { scene } = window.__runekPerf.get()
  let lights = 0, casters = 0
  const materials = new Set()
  scene.traverseVisible((o) => {
    // A part the static batcher stands in for isn't drawn itself.
    if (!o.layers.isEnabled(0)) return
    if (o.isPointLight || o.isSpotLight) lights++
    if ((o.isMesh || o.isPoints) && o.castShadow) casters++
    if (o.material) for (const m of [o.material].flat()) materials.add(m)
  })
  return { lights, casters, materials: materials.size }
})()`

const BATCH_STATS = `JSON.stringify(window.__runekPerf.get().scene.children.find((c) => c.name === 'runek:batches')?.userData.batcher?.stats ?? null)`

const WINDOW_STATS = (from) => `(() => {
  const P = window.__perfFrames, f = P.frames.slice(${from})
  const avg = (k) => f.reduce((a, x) => a + x[k], 0) / Math.max(1, f.length)
  const max = (k) => Math.max(0, ...f.map((x) => x[k]))
  const ms = f.map((x) => x.ms).sort((a, b) => a - b)
  return { frames: f.length, fps: 1000 / avg('ms'), p95: ms[Math.floor(0.95 * (ms.length - 1))] ?? 0,
    jsMs: avg('js'), draws: avg('draws'), maxDraws: max('draws'), scenePasses: max('passes'),
    shadowPasses: max('shadows'), allocs: P.allocs, firstDraw: P.firstDraw }
})()`

const GPU_NAME = `(() => {
  const gl = document.createElement('canvas').getContext('webgl2')
  const info = gl?.getExtension('WEBGL_debug_renderer_info')
  return gl ? gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) : null
})()`

async function measure(base, scenario, port, dpr) {
  const b = await launch(port)
  try {
    const browser = (await b.send('Browser.getVersion')).result?.product
    await b.send('Page.enable')
    await b.send('Page.addScriptToEvaluateOnNewDocument', { source: INSTRUMENT })
    await b.send('Page.navigate', { url: `${base}/library?perf&dpr=${dpr}${scenario.query}` })
    for (let i = 0; i < 300; i++) {
      if (await b.evaluate('!!window.__runekPerf')) break
      await sleep(200)
    }
    await b.evaluate('window.__perfFrames.hook(window.__runekPerf.get())')
    await sleep(SETTLE_MS)
    // Static batching settles over a few scans; on a slow (software) renderer that takes longer,
    // so wait until the batches stop changing before measuring.
    let last = ''
    for (let quiet = 0, i = 0; quiet < 3 && i < 60; i++) {
      await sleep(1000)
      const now = await b.evaluate(BATCH_STATS)
      quiet = now === last ? quiet + 1 : 0
      last = now
    }
    if (scenario.turn) {
      await b.click(WIDTH / 2, HEIGHT / 2)
      await b.key('keyDown')
    }
    const from = await b.evaluate('window.__perfFrames.frames.length')
    const allocsBefore = await b.evaluate('window.__perfFrames.allocs')
    const start = Date.now()
    let scene = await b.evaluate(SCENE_STATS)
    while (Date.now() - start < 120000) {
      await sleep(500)
      const s = await b.evaluate(SCENE_STATS)
      scene = {
        lights: Math.max(scene.lights, s.lights),
        casters: Math.max(scene.casters, s.casters),
        materials: Math.max(scene.materials, s.materials),
      }
      const n = (await b.evaluate('window.__perfFrames.frames.length')) - from
      if (Date.now() - start >= MEASURE_MS && n >= MIN_FRAMES) break
    }
    if (scenario.turn) await b.key('keyUp')
    const w = await b.evaluate(WINDOW_STATS(from))
    const gpu = await b.evaluate(GPU_NAME)
    return { ...w, allocs: w.allocs - allocsBefore, ...scene, browser, gpu }
  } finally {
    await b.close()
  }
}

const COUNTERS = [
  ['draws', 'draws/frame', (r) => Math.round(r.draws)],
  ['scenePasses', 'scene passes', (r) => r.scenePasses],
  ['shadowPasses', 'shadow passes', (r) => r.shadowPasses],
  ['lights', 'point+spot lights', (r) => r.lights],
  ['casters', 'shadow casters', (r) => r.casters],
  ['materials', 'materials', (r) => r.materials],
  ['allocs', 'target allocs', (r) => r.allocs],
]

let served = null
let base = option('url')
if (!base) {
  const dist = join(root, 'apps/docs/dist')
  if (!existsSync(join(dist, 'library'))) {
    console.error('✗ apps/docs/dist has no /library: run `just build-docs` first')
    process.exit(1)
  }
  served = await serve(dist)
  base = `http://127.0.0.1:${served.port}`
}

const failures = []
let port = 9450

// Measures every scenario at one pixel density; budgets apply only at the default one.
async function measureAll(at) {
  const checked = at === dpr
  const results = {}
  if (update) console.log(`\npixel density ${at}${checked ? ' (budget)' : ''}`)
  for (const scenario of SCENARIOS) {
    const r = await measure(base, scenario, port++, at)
    results[scenario.name] = r
    const limits = checked ? (budget.scenarios[scenario.name] ?? {}) : {}
    const cells = COUNTERS.map(([key, label, read]) => {
      const value = read(r)
      const limit = limits[key]
      const over = limit !== undefined && value > limit
      if (over) failures.push(`${scenario.name}: ${label} ${value} > ${limit}`)
      return `${label} ${value}${limit !== undefined ? `/${limit}` : ''}${over ? ' ✗' : ''}`
    })
    const minFps = checked ? budget.timing?.[scenario.name]?.minFps : undefined
    const slow = minFps !== undefined && r.fps < minFps
    if (timing && slow) failures.push(`${scenario.name}: ${r.fps.toFixed(1)} fps < ${minFps}`)
    console.log(
      `${scenario.name.padEnd(8)} ${r.fps.toFixed(1).padStart(6)} fps  p95 ${r.p95.toFixed(1)} ms  js ${r.jsMs.toFixed(1)} ms` +
        `${minFps !== undefined ? `  (min ${minFps}${slow ? (timing ? ' ✗' : ', not enforced') : ''})` : ''}`,
    )
    console.log(`         ${cells.join('  ')}`)
  }
  return results
}

const results = await measureAll(dpr)
const matrix = { [dpr]: results }
if (update) for (const at of UPDATE_DPRS.filter((d) => d !== dpr)) matrix[at] = await measureAll(at)

served?.server.close()
const out = option('json')
if (out) writeFileSync(out, `${JSON.stringify({ scale, results }, null, 2)}\n`)
if (update) {
  const gpu = results.spawn.gpu ?? 'unknown'
  if (/swiftshader|llvmpipe|software/i.test(gpu)) {
    console.error(`✗ not saved: Chrome fell back to software rendering (${gpu})`)
    process.exit(1)
  }
  const file = saveMachine(gpu, results.spawn.browser, matrix)
  console.log(`\nsaved ${file.slice(root.length + 1)}`)
}
if (failures.length) {
  console.error(`\n✗ over budget (scripts/perf-budget.json):\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
console.log('\n✓ within budget')
process.exit(0)

// What describes this machine's results without identifying anyone: no hostname, user or paths.
function saveMachine(gpu, browser, matrix) {
  const git = (...a) =>
    execFileSync('git', a, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  const tag = (() => {
    try {
      return git('describe', '--tags', '--exact-match')
    } catch {
      return null
    }
  })()
  const os = osName()
  const cpu = cpus()[0]?.model.trim() ?? 'unknown'
  const measured = new Date().toLocaleDateString('sv')
  const data = {
    measured,
    // The release this build is, or the last one before it when measured between releases.
    release: tag ?? git('describe', '--tags', '--abbrev=0'),
    released: tag !== null,
    commit: git('rev-parse', '--short', 'HEAD'),
    machine: {
      os,
      arch: process.arch,
      cpu,
      cores: cpus().length,
      memoryGB: Math.round(totalmem() / 2 ** 30),
      gpu,
    },
    browser: browser?.replace('HeadlessChrome', 'Chrome') ?? 'unknown',
    window: { width: WIDTH, height: HEIGHT },
    runs: Object.entries(matrix)
      .map(([at, res]) => ({
        dpr: Number(at),
        fps: Object.fromEntries(
          Object.entries(res).map(([name, r]) => [name, Math.round(r.fps * 10) / 10]),
        ),
        p95: Object.fromEntries(
          Object.entries(res).map(([name, r]) => [name, Math.round(r.p95 * 10) / 10]),
        ),
      }))
      .sort((a, b) => a.dpr - b.dpr),
  }
  const slug = `${measured}-${os}-${cpu}`
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-|-$/g, '')
  const file = join(root, 'apps/docs/src/data/perf', `${slug}.json`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
  return file
}

function osName() {
  if (process.platform === 'darwin')
    return `macOS ${execFileSync('sw_vers', ['-productVersion'], { encoding: 'utf8' }).trim()}`
  if (process.platform === 'win32') return `Windows ${release()}`
  try {
    const pretty = readFileSync('/etc/os-release', 'utf8').match(/^PRETTY_NAME="?([^"\n]+)/m)
    if (pretty) return pretty[1]
  } catch {}
  return `${process.platform} ${release()}`
}
