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
}

const asVec3 = (value: unknown): Vec3 | undefined =>
  Array.isArray(value) && value.length === 3 ? (value as Vec3) : undefined

/**
 * Render a list of world nodes by looking each `type` up in the registry. Recurses
 * into children. Two node types resolve without a registry component: the built-in
 * `Group` (a plain transform container) and any registry entry that is a composite
 * (expanded eagerly into its arrangement inside a positioned group).
 */
export function WorldNodes({ nodes, registry }: WorldNodesProps) {
  return (
    <>
      {nodes.map((node, index) => {
        const key = node.id ?? index
        const props = node.props ?? {}

        if (node.type === 'Group') {
          return (
            <group key={key} position={asVec3(props.position)} rotation={asVec3(props.rotation)}>
              {node.children?.length ? (
                <WorldNodes nodes={node.children} registry={registry} />
              ) : null}
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
              <WorldNodes nodes={arrangement} registry={registry} />
              {node.children?.length ? (
                <WorldNodes nodes={node.children} registry={registry} />
              ) : null}
            </group>
          )
        }

        const Component = entry
        // Pass nested child nodes as children only when present; otherwise render with no
        // children expression so `props.children` (e.g. a `Sign`'s text authored in JSON)
        // flows through instead of being clobbered by a null child.
        return node.children?.length ? (
          <Component key={key} {...props}>
            <WorldNodes nodes={node.children} registry={registry} />
          </Component>
        ) : (
          <Component key={key} {...props} />
        )
      })}
    </>
  )
}
