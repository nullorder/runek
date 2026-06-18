import type { ComponentRegistry } from '@runek/core'
import { Bookshelf } from './Bookshelf'
import { Chair } from './Chair'
import { Clock } from './Clock'
import { Door } from './Door'
import { Floor } from './Floor'
import { Grass } from './Grass'
import { House } from './House'
import { Lake } from './Lake'
import { Lamp } from './Lamp'
import { LightRig } from './LightRig'
import { Player } from './Player'
import { Rocks } from './Rocks'
import { Roof } from './Roof'
import { Room } from './Room'
import { Rug } from './Rug'
import { Shelf } from './Shelf'
import { Shore } from './Shore'
import { Sky } from './Sky'
import { Staircase } from './Staircase'
import { Table } from './Table'
import { Terrain } from './Terrain'
import { Trees } from './Trees'
import { Wall } from './Wall'
import { Window } from './Window'

/** The default Runek component registry: name → component, for data-driven rendering. */
export const registry: ComponentRegistry = {
  Bookshelf,
  Chair,
  Clock,
  Door,
  Floor,
  Grass,
  House,
  Lake,
  Lamp,
  LightRig,
  Player,
  Rocks,
  Roof,
  Room,
  Rug,
  Shelf,
  Shore,
  Sky,
  Staircase,
  Table,
  Terrain,
  Trees,
  Wall,
  Window,
}
