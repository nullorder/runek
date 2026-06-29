import type { ComponentRegistry, WorldNode } from './world-data'

export interface WorldNodesProps {
  nodes: WorldNode[]
  registry: ComponentRegistry
}

/** Render a list of world nodes by looking each `type` up in the registry. Recurses into children. */
export function WorldNodes({ nodes, registry }: WorldNodesProps) {
  return (
    <>
      {nodes.map((node, index) => {
        const Component = registry[node.type]
        if (!Component) {
          console.warn(`[runek] Unknown component "${node.type}" — skipped.`)
          return null
        }
        // Pass nested child nodes as children only when present; otherwise render with no
        // children expression so `props.children` (e.g. a `Sign`'s text authored in JSON)
        // flows through instead of being clobbered by a null child.
        return node.children?.length ? (
          <Component key={node.id ?? index} {...node.props}>
            <WorldNodes nodes={node.children} registry={registry} />
          </Component>
        ) : (
          <Component key={node.id ?? index} {...node.props} />
        )
      })}
    </>
  )
}
