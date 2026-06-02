import { Bookshelf, Player, Room, Terrain } from '@runek/components'
import { World } from '@runek/core'

export function App() {
  return (
    <>
      <World>
        <Terrain size={[60, 60]} />
        <Room position={[0, 0.02, 0]} size={[8, 8]} height={3} />
        <Bookshelf position={[0, 1.04, -3.5]} seed={42} fill={0.85} />
        <Player position={[0, 3, 2.5]} view="first" />
      </World>
      <p className="hint">
        <b>WASD</b> / arrows move · <b>Shift</b> run · <b>Space</b> jump · <b>drag</b> to look
      </p>
    </>
  )
}
