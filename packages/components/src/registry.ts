import type { ComponentRegistry, CompositeDef } from '@runek/core'
import { ArcadeCabinet } from './ArcadeCabinet'
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
import { CoffeeMachine } from './CoffeeMachine'
import { Compass } from './Compass'
import { Counter } from './Counter'
import { Crate } from './Crate'
import { CurvedWall } from './CurvedWall'
import houseComposite from './composites/house.json'
import roomComposite from './composites/room.json'
import { Desk } from './Desk'
import { Dock } from './Dock'
import { Door } from './Door'
import { Fence } from './Fence'
import { Flag } from './Flag'
import { Floor } from './Floor'
import { Flowers } from './Flowers'
import { Fountain } from './Fountain'
import { Fridge } from './Fridge'
import { Grass } from './Grass'
import { Hedge } from './Hedge'
import { Hut } from './Hut'
import { Interactable } from './Interactable'
import { Lake } from './Lake'
import { Lamp } from './Lamp'
import { Level } from './Level'
import { LightRig } from './LightRig'
import { Monitor } from './Monitor'
import { Ocean } from './Ocean'
import { OfficeChair } from './OfficeChair'
import { Palm } from './Palm'
import { Path } from './Path'
import { Person } from './Person'
import { Pillar } from './Pillar'
import { Plant } from './Plant'
import { Player } from './Player'
import { Pool } from './Pool'
import { PoolTable } from './PoolTable'
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
import { Slab } from './Slab'
import { Sofa } from './Sofa'
import { Staircase } from './Staircase'
import { Stool } from './Stool'
import { Table } from './Table'
import { Tent } from './Tent'
import { Terrain } from './Terrain'
import { Trees } from './Trees'
import { Tv } from './Tv'
import { Wall } from './Wall'
import { Well } from './Well'
import { Whiteboard } from './Whiteboard'
import { Windmill } from './Windmill'
import { Window } from './Window'

/** The default Runek component registry: name → component, for data-driven rendering. */
export const registry: ComponentRegistry = {
  ArcadeCabinet,
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
  CoffeeMachine,
  Compass,
  Counter,
  Crate,
  CurvedWall,
  Desk,
  Dock,
  Door,
  Fence,
  Flag,
  Floor,
  Flowers,
  Fountain,
  Fridge,
  Grass,
  Hedge,
  // Composites: data-only arrangements of the parts below, expanded by the renderer.
  // (JSON imports infer wide types — number[] vs the bounds tuple — hence the two-step cast.)
  House: houseComposite as unknown as CompositeDef,
  Hut,
  Interactable,
  Lake,
  Lamp,
  Level,
  LightRig,
  Monitor,
  Ocean,
  OfficeChair,
  Palm,
  Path,
  Person,
  Pillar,
  Plant,
  Player,
  Pool,
  PoolTable,
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
  Slab,
  Sofa,
  Staircase,
  Stool,
  Table,
  Tent,
  Terrain,
  Trees,
  Tv,
  Wall,
  Well,
  Whiteboard,
  Windmill,
  Window,
}
