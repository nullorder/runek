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
        const children = node.children?.length ? (
          <WorldNodes nodes={node.children} registry={registry} />
        ) : null
        return (
          <Component key={index} {...node.props}>
            {children}
          </Component>
        )
      })}
    </>
  )
}
