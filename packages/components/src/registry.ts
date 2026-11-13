import type { ComponentRegistry, CompositeDef } from '@runek/core'
import { AcousticPanel } from './AcousticPanel'
import { AcUnit } from './AcUnit'
import { ArcadeCabinet } from './ArcadeCabinet'
import { Arch } from './Arch'
import { Awning } from './Awning'
import { Barrel } from './Barrel'
import { BassTrap } from './BassTrap'
import { BeachChair } from './BeachChair'
import { Bed } from './Bed'
import { Bench } from './Bench'
import { Birds } from './Birds'
import { BladeSign } from './BladeSign'
import { Book } from './Book'
import { Bookshelf } from './Bookshelf'
import { Bridge } from './Bridge'
import { Bush } from './Bush'
import { CableSag } from './CableSag'
import { Campfire } from './Campfire'
import { Cave } from './Cave'
import { CeilingLight } from './CeilingLight'
import { Chair } from './Chair'
import { Chandelier } from './Chandelier'
import { ChessBoard } from './ChessBoard'
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
import { DeskLamp } from './DeskLamp'
import { Diffuser } from './Diffuser'
import { Dock } from './Dock'
import { Door } from './Door'
import { DrumKit } from './DrumKit'
import { Fence } from './Fence'
import { Flag } from './Flag'
import { Floor } from './Floor'
import { Flowers } from './Flowers'
import { Fountain } from './Fountain'
import { Fridge } from './Fridge'
import { GameConsole } from './GameConsole'
import { GlassRail } from './GlassRail'
import { GlassWall } from './GlassWall'
import { Grass } from './Grass'
import { Guitar } from './Guitar'
import { Hedge } from './Hedge'
import { Hut } from './Hut'
import { Interactable } from './Interactable'
import { KitchenUnits } from './KitchenUnits'
import { Lake } from './Lake'
import { Lamp } from './Lamp'
import { Level } from './Level'
import { Lighthouse } from './Lighthouse'
import { LightRig } from './LightRig'
import { MagazineRack } from './MagazineRack'
import { MicStand } from './MicStand'
import { Monitor } from './Monitor'
import { NeonStrip } from './NeonStrip'
import { Newspapers } from './Newspapers'
import { Ocean } from './Ocean'
import { OfficeChair } from './OfficeChair'
import { Palm } from './Palm'
import { Path } from './Path'
import { Person } from './Person'
import { Piano } from './Piano'
import { PictureLight } from './PictureLight'
import { Pillar } from './Pillar'
import { PipeRun } from './PipeRun'
import { Plant } from './Plant'
import { Player } from './Player'
import { Pool } from './Pool'
import { PoolTable } from './PoolTable'
import { Portal } from './Portal'
import { Poster } from './Poster'
import { Rift } from './Rift'
import { Road } from './Road'
import { Rocks } from './Rocks'
import { RollerShutter } from './RollerShutter'
import { Roof } from './Roof'
import { Rug } from './Rug'
import { Sailboat } from './Sailboat'
import { Screen } from './Screen'
import { Shelf } from './Shelf'
import { Ship } from './Ship'
import { Shore } from './Shore'
import { Sign } from './Sign'
import { Signpost } from './Signpost'
import { Sky } from './Sky'
import { Slab } from './Slab'
import { Sofa } from './Sofa'
import { Speaker } from './Speaker'
import { Staircase } from './Staircase'
import { Stool } from './Stool'
import { StreetLamp } from './StreetLamp'
import { Table } from './Table'
import { TableTennis } from './TableTennis'
import { Tableware } from './Tableware'
import { Tent } from './Tent'
import { Terrain } from './Terrain'
import { TikiTorch } from './TikiTorch'
import { Tower } from './Tower'
import { Trees } from './Trees'
import { Tv } from './Tv'
import { Umbrella } from './Umbrella'
import { VendingMachine } from './VendingMachine'
import { Vent } from './Vent'
import { Wall } from './Wall'
import { Well } from './Well'
import { Whiteboard } from './Whiteboard'
import { Windmill } from './Windmill'
import { Window } from './Window'

/** The default Runek component registry: name → component, for data-driven rendering. */
export const registry: ComponentRegistry = {
  AcousticPanel,
  AcUnit,
  ArcadeCabinet,
  Arch,
  Awning,
  Barrel,
  BassTrap,
  BeachChair,
  Bed,
  Bench,
  Birds,
  BladeSign,
  Book,
  Bookshelf,
  Bridge,
  Bush,
  CableSag,
  Campfire,
  Cave,
  CeilingLight,
  Chair,
  Chandelier,
  ChessBoard,
  Cliff,
  Clock,
  Clouds,
  CoffeeMachine,
  Compass,
  Counter,
  Crate,
  CurvedWall,
  Desk,
  DeskLamp,
  Diffuser,
  Dock,
  Door,
  DrumKit,
  Fence,
  Flag,
  Floor,
  Flowers,
  Fountain,
  Fridge,
  GameConsole,
  GlassRail,
  GlassWall,
  Grass,
  Guitar,
  Hedge,
  // Composites: data-only arrangements of the parts below, expanded by the renderer.
  // (JSON imports infer wide types — number[] vs the bounds tuple — hence the two-step cast.)
  House: houseComposite as unknown as CompositeDef,
  Hut,
  Interactable,
  KitchenUnits,
  Lake,
  Lamp,
  Level,
  LightRig,
  Lighthouse,
  MagazineRack,
  MicStand,
  Monitor,
  NeonStrip,
  Newspapers,
  Ocean,
  OfficeChair,
  Palm,
  Path,
  Person,
  Piano,
  PictureLight,
  Pillar,
  PipeRun,
  Plant,
  Player,
  Pool,
  PoolTable,
  Portal,
  Poster,
  Rift,
  Road,
  Rocks,
  RollerShutter,
  Roof,
  Room: roomComposite as unknown as CompositeDef,
  Rug,
  Sailboat,
  Screen,
  Shelf,
  Ship,
  Shore,
  Sign,
  Signpost,
  Sky,
  Slab,
  Sofa,
  Speaker,
  Staircase,
  Stool,
  StreetLamp,
  Table,
  TableTennis,
  Tableware,
  Tent,
  Terrain,
  TikiTorch,
  Tower,
  Trees,
  Tv,
  Umbrella,
  VendingMachine,
  Vent,
  Wall,
  Well,
  Whiteboard,
  Windmill,
  Window,
}
