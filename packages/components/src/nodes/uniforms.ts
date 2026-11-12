import { float, uniform } from 'three/tsl'
import { Node, type NodeFrame, NodeUpdateType } from 'three/webgpu'

/** A TSL uniform that follows `entry.value` every render, so the `{ value }` records a
 *  component already updates (for its GLSL material) drive its node material too. */
export function follow<N extends Node>(entry: { value: unknown }): N {
  return uniform(entry.value as never).onRenderUpdate(() => entry.value as never) as unknown as N
}

class BeforeDraw extends Node {
  constructor(private readonly run: (frame: NodeFrame) => void) {
    super('float')
    this.updateBeforeType = NodeUpdateType.OBJECT
  }

  updateBefore(frame: NodeFrame) {
    this.run(frame)
    return true
  }

  setup() {
    return float(0)
  }
}

/**
 * A node worth 0 that runs `run` before each object using it draws: add it to anything in the
 * material to have it run. For what a uniform can't do per object, like pointing a texture node at
 * another texture (a texture node resets its own update hook when it builds).
 */
export function beforeDraw(run: (frame: NodeFrame) => void): Node<'float'> {
  return new BeforeDraw(run) as unknown as Node<'float'>
}
