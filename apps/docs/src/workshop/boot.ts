import { assignNodeIds, parseWorld, type WorldData } from '@runek/core/data'
import { importWorldText } from './actions'
import { live } from './scene/refs'
import { SCHEMA } from './schema'
import { decodeShare, parseHash } from './share/codec'
import { loadSession, restoreSession } from './share/persist'
import { DEFAULT_LAB, setLabType, toast, useWorkshop } from './state/store'
import { templateById } from './templates'

/** Pick the starting state: a share link wins, then `?src=`, then the saved session, then the
 *  reading-room template. A `#m=lab&c=Name` hash opens a component in the lab. */
export async function boot() {
  const { share, mode, component } = parseHash(location.hash)
  const params = new URLSearchParams(location.search)
  const src = params.get('src')
  const lab = component ?? params.get('lab')

  if (share) {
    try {
      const payload = await decodeShare(share)
      const world = assignNodeIds(parseWorld(JSON.stringify(payload.world)))
      useWorkshop.setState((s) => ({
        world,
        mode: payload.mode ?? 'build',
        stage: payload.stage ?? 'room',
        code: payload.code ?? null,
        sandbox: { ...s.sandbox, gated: !!payload.code, running: false },
        lab: payload.lab
          ? { ...DEFAULT_LAB, type: payload.lab.type, props: payload.lab.props }
          : s.lab,
      }))
      if (payload.camera) live.camera = payload.camera
      toast(
        payload.code
          ? 'Opened a shared world with code: review it before running.'
          : 'Opened a shared world',
      )
      return
    } catch (error) {
      toast(`Couldn't open that link: ${(error as Error).message}`)
    }
  }

  const saved = loadSession()
  if (saved) restoreSession(saved)
  else {
    const start = templateById('reading-room')
    if (start) {
      seed(start.world)
      live.camera = start.camera
    }
  }

  if (src) {
    try {
      const response = await fetch(src)
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      importWorldText(await response.text(), new URL(src).hostname)
    } catch (error) {
      toast(`Couldn't load ${src}: ${(error as Error).message}`)
    }
  }

  const named =
    lab &&
    Object.keys(SCHEMA).find(
      (n) => n.toLowerCase() === lab.toLowerCase() || SCHEMA[n].name === lab.toLowerCase(),
    )
  if (named) {
    setLabType(named)
    useWorkshop.setState({ mode: 'lab' })
  } else if (mode) useWorkshop.setState({ mode })
}

function seed(world: WorldData | undefined) {
  if (world) useWorkshop.setState({ world: assignNodeIds(world) })
}
