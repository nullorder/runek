import { rng, useMaterials, useWorld, type WorldComponentProps } from '@runek/core'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { type InstancedMesh, Object3D } from 'three'

export interface DiffuserProps extends WorldComponentProps {
  width?: number
  height?: number
  /** Blocks across; the rows follow from the height. */
  cells?: number
  /** The deepest block, in units. */
  depth?: number
  /** Defaults to the world palette's `wood` slot. */
  color?: string
}

const PRIME = 11

/** Block depths, in steps, from a quadratic-residue sequence: n² mod p for a prime p, the
 *  pattern a QRD diffuser is cut to so it scatters sound evenly. */
function residues(offset: number): number[] {
  return Array.from({ length: PRIME }, (_, n) => ((n + offset) * (n + offset)) % PRIME)
}

/**
 * A skyline acoustic diffuser: a grid of square wooden blocks standing out from a backboard to
 * depths laid out by a quadratic-residue sequence, so a wall of them breaks up reflections
 * instead of returning them. Its origin is the middle of its back, against the wall (local
 * -Z). The seed shifts where each row starts in the sequence. Decorative: no collider.
 */
export function Diffuser({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  width = 1.2,
  height = 1.2,
  cells = 11,
  depth = 0.2,
  color,
}: DiffuserProps) {
  const { unit, palette } = useWorld()
  const m = useMaterials({
    back: { color: palette.woodDark, roughness: 0.9 },
    block: { color: color ?? palette.wood, roughness: 0.75 },
  })
  const W = width * unit
  const cell = W / cells
  const rows = Math.max(1, Math.round((height * unit) / cell))
  const H = rows * cell
  const back = 0.02 * unit
  const ref = useRef<InstancedMesh>(null)

  const blocks = useMemo(() => {
    const next = rng(seed)
    const out: { x: number; y: number; d: number }[] = []
    for (let r = 0; r < rows; r++) {
      const seq = residues(Math.floor(next() * PRIME) + r)
      for (let c = 0; c < cells; c++) {
        out.push({
          x: -W / 2 + cell * (c + 0.5),
          y: -H / 2 + cell * (r + 0.5),
          d: ((seq[c % PRIME] + 1) / PRIME) * depth * unit,
        })
      }
    }
    return out
  }, [seed, rows, cells, cell, W, H, depth, unit])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    blocks.forEach((b, i) => {
      dummy.position.set(b.x, b.y, back + b.d / 2)
      dummy.scale.set(cell * 0.94, cell * 0.94, b.d)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [blocks, cell, back])

  return (
    <group position={position} rotation={rotation}>
      <mesh material={m.back} receiveShadow position={[0, 0, back / 2]}>
        <boxGeometry args={[W, H, back]} />
      </mesh>
      <instancedMesh
        key={blocks.length}
        ref={ref}
        args={[undefined, undefined, blocks.length]}
        material={m.block}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
    </group>
  )
}
