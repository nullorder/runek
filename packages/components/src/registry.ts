import type { ComponentRegistry, CompositeDef } from '@runek/core'
import { Arch } from './Arch'
import { Barrel } from './Barrel'
import { Bed } from './Bed'
import { Bench } from './Bench'
import { Birds } from './Birds'
import { Book } from './Book'
import { Bookshelf } from './Bookshelf'
import { Bridge } from './Bridge'
import { Bush } from './Bush'
import { Campfire } from './Campfire'
import { Chair } from './Chair'
import { Cliff } from './Cliff'
import { Clock } from './Clock'
import { Clouds } from './Clouds'
import { Compass } from './Compass'
import { Counter } from './Counter'
import { Crate } from './Crate'
import houseComposite from './composites/house.json'
import roomComposite from './composites/room.json'
import { Dock } from './Dock'
import { Door } from './Door'
import { Fence } from './Fence'
import { Flag } from './Flag'
import { Floor } from './Floor'
import { Flowers } from './Flowers'
import { Fountain } from './Fountain'
import { Grass } from './Grass'
import { Hedge } from './Hedge'
import { Hut } from './Hut'
import { Lake } from './Lake'
import { Lamp } from './Lamp'
import { Level } from './Level'
import { LightRig } from './LightRig'
import { Ocean } from './Ocean'
import { Path } from './Path'
import { Pillar } from './Pillar'
import { Plant } from './Plant'
import { Player } from './Player'
import { Portal } from './Portal'
import { Road } from './Road'
import { Rocks } from './Rocks'
import { Roof } from './Roof'
import { Rug } from './Rug'
import { Sailboat } from './Sailboat'
import { Shelf } from './Shelf'
import { Shore } from './Shore'
import { Sign } from './Sign'
import { Signpost } from './Signpost'
import { Sky } from './Sky'
import { Staircase } from './Staircase'
import { Stool } from './Stool'
import { Table } from './Table'
import { Tent } from './Tent'
import { Terrain } from './Terrain'
import { Trees } from './Trees'
import { Wall } from './Wall'
import { Well } from './Well'
import { Windmill } from './Windmill'
import { Window } from './Window'

/** The default Runek component registry: name → component, for data-driven rendering. */
export const registry: ComponentRegistry = {
  Arch,
  Barrel,
  Bed,
  Bench,
  Birds,
  Book,
  Bookshelf,
  Bridge,
  Bush,
  Campfire,
  Chair,
  Cliff,
  Clock,
  Clouds,
  Compass,
  Counter,
  Crate,
  Dock,
  Door,
  Fence,
  Flag,
  Floor,
  Flowers,
  Fountain,
  Grass,
  Hedge,
  // Composites: data-only arrangements of the parts below, expanded by the renderer.
  // (JSON imports infer wide types — number[] vs the bounds tuple — hence the two-step cast.)
  House: houseComposite as unknown as CompositeDef,
  Hut,
  Lake,
  Lamp,
  Level,
  LightRig,
  Ocean,
  Path,
  Pillar,
  Plant,
  Player,
  Portal,
  Road,
  Rocks,
  Roof,
  Room: roomComposite as unknown as CompositeDef,
  Rug,
  Sailboat,
  Shelf,
  Shore,
  Sign,
  Signpost,
  Sky,
  Staircase,
  Stool,
  Table,
  Tent,
  Terrain,
  Trees,
  Wall,
  Well,
  Windmill,
  Window,
}
