import type { GroundIndex } from './ground'
import type { Vec3 } from './types'
import {
  type ComponentRegistry,
  isCompositeDef,
  seedCompositeNodes,
  type WorldNode,
} from './world-data'

export interface WorldNodesProps {
  nodes: WorldNode[]
  registry: ComponentRegistry
  /** The world's ground index. Anchored nodes resolve their Y through it; without one they
   *  render with their authored position, as if absolute. */
  ground?: GroundIndex | null
  /** Tree path of the parent node, matching the ground index's paths. Set by recursion. */
  path?: string
  /** Path prefix for this list's entries (`a` marks a composite's arrangement). */
  prefix?: string
}

const asVec3 = (value: unknown): Vec3 | undefined =>
  Array.isArray(value) && value.length === 3 ? (value as Vec3) : undefined

/** Tree path of the `index`th node in a list, as `createGroundIndex` numbers it. */
export const nodePath = (parent: string | undefined, index: number, prefix = '') =>
  parent === undefined ? `${index}` : `${parent}/${prefix}${index}`

/**
 * Render a list of world nodes by looking each `type` up in the registry. Recurses
 * into children. Two node types resolve without a registry component: the built-in
 * `Group` (a plain transform container) and any registry entry that is a composite
 * (expanded eagerly into its arrangement inside a positioned group).
 */
export function WorldNodes({ nodes, registry, ground, path: parent, prefix }: WorldNodesProps) {
  return (
    <>
      {nodes.map((node, index) => {
        const key = node.id ?? index
        const path = nodePath(parent, index, prefix)
        const anchored = node.anchor ? ground?.position(path) : undefined
        const props = anchored ? { ...node.props, position: anchored } : (node.props ?? {})
        const children = node.children?.length ? (
          <WorldNodes nodes={node.children} registry={registry} ground={ground} path={path} />
        ) : null

        if (node.type === 'Group') {
          return (
            <group key={key} position={asVec3(props.position)} rotation={asVec3(props.rotation)}>
              {children}
            </group>
          )
        }

        const entry = registry[node.type]
        if (!entry) {
          console.warn(`[runek] Unknown component "${node.type}" — skipped.`)
          return null
        }

        if (isCompositeDef(entry)) {
          const arrangement = seedCompositeNodes(entry.nodes, props.seed as number | undefined)
          return (
            <group key={key} position={asVec3(props.position)} rotation={asVec3(props.rotation)}>
              <WorldNodes
                nodes={arrangement}
                registry={registry}
                ground={ground}
                path={path}
                prefix="a"
              />
              {children}
            </group>
          )
        }

        const Component = entry
        // Pass nested child nodes as children only when present; otherwise render with no
        // children expression so `props.children` (e.g. a `Sign`'s text authored in JSON)
        // flows through instead of being clobbered by a null child.
        return children ? (
          <Component key={key} {...props}>
            {children}
          </Component>
        ) : (
          <Component key={key} {...props} />
        )
      })}
    </>
  )
}
