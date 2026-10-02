// One shared queue for figure builds: short tasks between frames (never more than a few
// milliseconds at once, so input and rendering stay smooth), coarse builds before detailed ones,
// nearest first. Finished builds are cached by spec, so identical figures
// (and a figure that walks out of detail range and back) never build twice.
import { type BuiltFigure, buildFigure, type Lod } from './build'
import type { FigureSpec } from './spec'

/** Longest stretch of build work before yielding back to the page, in milliseconds. */
const BUDGET = 6
/** Finished builds kept for reuse (a full-detail one is ~10 MB of arrays). */
const KEEP: Record<Lod, number> = { near: 4, far: 48 }

type Listener = (built: BuiltFigure) => void

interface Job {
  key: string
  lod: Lod
  gen: Generator<void, BuiltFigure>
  listeners: Map<Listener, () => number>
}

const cache: Record<Lod, Map<string, BuiltFigure>> = { near: new Map(), far: new Map() }
const jobs = new Map<string, Job>()
let ticking = false

export function figureKey(spec: FigureSpec) {
  return JSON.stringify(spec)
}

/** A finished build, if there is one (refreshing its place in the cache). */
export function peekFigure(key: string, lod: Lod): BuiltFigure | null {
  const hit = cache[lod].get(key)
  if (!hit) return null
  cache[lod].delete(key)
  cache[lod].set(key, hit)
  return hit
}

/**
 * Ask for a build. `onReady` fires once it's done (synchronously when cached); `distance` is read
 * whenever the queue picks its next job. Returns a cancel: a build nobody waits for is dropped.
 */
export function requestFigure(
  spec: FigureSpec,
  key: string,
  lod: Lod,
  distance: () => number,
  onReady: Listener,
): () => void {
  const hit = peekFigure(key, lod)
  if (hit) {
    onReady(hit)
    return () => {}
  }
  const id = `${lod}:${key}`
  let job = jobs.get(id)
  if (!job) {
    job = { key, lod, gen: buildFigure(spec, lod), listeners: new Map() }
    jobs.set(id, job)
  }
  job.listeners.set(onReady, distance)
  schedule()
  const mine = job
  return () => {
    mine.listeners.delete(onReady)
    if (mine.listeners.size === 0 && jobs.get(id) === mine) jobs.delete(id)
  }
}

function priority(job: Job) {
  let d = Number.POSITIVE_INFINITY
  for (const read of job.listeners.values()) d = Math.min(d, read())
  return (job.lod === 'far' ? 0 : 1e6) + d
}

// A message-channel task runs as soon as the page is idle, without setTimeout's clamping.
let channel: MessageChannel | null = null
function schedule() {
  if (ticking || jobs.size === 0) return
  ticking = true
  if (typeof MessageChannel === 'function') {
    if (!channel) {
      channel = new MessageChannel()
      channel.port1.onmessage = tick
    }
    channel.port2.postMessage(null)
  } else setTimeout(tick, 0)
}

function tick() {
  ticking = false
  const deadline = performance.now() + BUDGET
  while (jobs.size > 0 && performance.now() < deadline) {
    let best: [string, Job] | null = null
    let bestP = Number.POSITIVE_INFINITY
    for (const entry of jobs) {
      const p = priority(entry[1])
      if (p < bestP) {
        bestP = p
        best = entry
      }
    }
    if (!best) break
    const [id, job] = best
    let done: BuiltFigure | null = null
    while (performance.now() < deadline) {
      const r = job.gen.next()
      if (r.done) {
        done = r.value
        break
      }
    }
    if (!done) break
    jobs.delete(id)
    const store = cache[job.lod]
    store.set(job.key, done)
    while (store.size > KEEP[job.lod]) {
      const oldest = store.keys().next().value
      if (oldest === undefined) break
      store.delete(oldest)
    }
    for (const listener of job.listeners.keys()) listener(done)
  }
  schedule()
}
