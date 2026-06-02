import {
  Bookshelf,
  Chair,
  Grass,
  House,
  Lake,
  Lamp,
  LightRig,
  Player,
  Rocks,
  Rug,
  Shelf,
  Shore,
  Sky,
  Staircase,
  Table,
  Terrain,
  Trees,
} from '@runek/components'
import { World } from '@runek/core'

const SUN: [number, number, number] = [60, 25, 30]

export function App() {
  return (
    <>
      <World lights={false}>
        <Sky sunPosition={SUN} />
        <LightRig sunPosition={SUN} shadowRange={34} />
        <Terrain size={[120, 120]} relief={3} flatRadius={28} resolution={80} seed={9} />

        {/* the house and its contents */}
        <House position={[0, 0.02, 0]} size={[9, 9]} height={3} />
        <Rug position={[0, 0.03, -0.8]} size={[4.5, 3]} seed={7} />
        <Table position={[0, 0.02, -0.8]} />
        <Chair position={[0, 0.02, 0.3]} />
        <Chair position={[0, 0.02, -1.9]} rotation={[0, Math.PI, 0]} />
        <Bookshelf position={[-3.4, 1.04, -3.7]} seed={42} fill={0.85} />
        <Shelf position={[-4.1, 0.02, 1.4]} rotation={[0, Math.PI / 2, 0]} />
        <Lamp position={[3.4, 0.02, -3.4]} />
        <Staircase position={[3.4, 0.02, -4]} steps={6} totalHeight={1.5} width={1.2} depth={2.4} />

        {/* the grounds */}
        <Grass position={[0, 0.02, 11]} area={[30, 12]} count={900} seed={3} />
        <Shore position={[18, 0.03, 0]} size={[24, 26]} />
        <Lake position={[18, 0.12, 0]} size={[15, 17]} />
        <Rocks position={[9, 0.02, -8]} count={7} spread={3.5} seed={11} />
        <Rocks position={[-10, 0.02, 6]} count={5} spread={2.5} size={0.8} seed={22} />
        <Trees position={[-12, 0.02, -7]} seed={4} segmentLength={0.8} />
        <Trees position={[13, 0.02, 11]} seed={8} />
        <Trees position={[-15, 0.02, 13]} seed={15} segmentLength={0.9} />

        <Player position={[-1, 3, 13]} view="first" yaw={Math.PI} />
      </World>
      <p className="hint">
        <b>WASD</b> / arrows move · <b>Shift</b> run · <b>Space</b> jump · <b>drag</b> to look
      </p>
    </>
  )
}
