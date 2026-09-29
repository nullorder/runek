// The React-free half of core: world data and ground queries. Safe to import from Node
// (scripts, tests, the CLI) without pulling in React, three.js, or the physics engine.
export type {
  CheckWorldOptions,
  GroundEntry,
  GroundIndex,
  GroundQuery,
  GroundQueryOptions,
  GroundRegistry,
  NodeAnchor,
  SurfaceDef,
  SurfaceFn,
  SurfaceKind,
  SurfaceWorld,
  WorldIssue,
  WorldIssueKind,
} from './ground.ts'
export {
  ANCHOR_KINDS,
  checkWorld,
  createGroundIndex,
  GROUND_TOLERANCE,
  groundAt,
} from './ground.ts'
export type {
  ComponentRegistry,
  CompositeDef,
  JsonValue,
  RegistryEntry,
  WorldAuthor,
  WorldData,
  WorldMeta,
  WorldNode,
  WorldSource,
} from './world-data.ts'
export {
  assignNodeIds,
  isCompositeDef,
  parseWorld,
  seedCompositeNodes,
  serializeWorld,
  unpackComposite,
} from './world-data.ts'
