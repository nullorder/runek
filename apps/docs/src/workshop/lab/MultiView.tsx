import { createPortal, useFrame, useThree } from '@react-three/fiber'
import type { JsonValue } from '@runek/core'
import { Fragment, useMemo } from 'react'
import { type PerspectiveCamera, Scene } from 'three'
import { nodeObjects } from '../scene/refs'
import { Subject } from './Subject'

/** Renders N subjects (seed grid, A/B) into scissored viewports of one canvas, one camera. */
export function MultiView({
  type,
  cells,
  columns,
  transparent = false,
  inset = { left: 0, right: 0, top: 0, bottom: 0 },
}: {
  type: string
  cells: { key: string; props: Record<string, JsonValue> }[]
  columns: number
  transparent?: boolean
  /** Pixels kept clear at the edges (under floating panels and bars); the grid fills the rest. */
  inset?: { left: number; right: number; top: number; bottom: number }
}) {
  const { gl, camera, size } = useThree()
  const scenes = useMemo(() => cells.map(() => new Scene()), [cells])
  const rows = Math.ceil(cells.length / columns)

  useFrame(() => {
    const cam = camera as PerspectiveCamera
    const w = (size.width - inset.left - inset.right) / columns
    const h = (size.height - inset.top - inset.bottom) / rows
    const aspect = cam.aspect
    cam.aspect = w / h
    cam.updateProjectionMatrix()
    if (inset.left || inset.right || inset.top || inset.bottom) {
      gl.setClearColor('#0e1116', transparent ? 0 : 1)
      gl.clear()
    }
    gl.setScissorTest(true)
    scenes.forEach((scene, i) => {
      const x = inset.left + (i % columns) * w
      const y = size.height - inset.top - (Math.floor(i / columns) + 1) * h
      gl.setViewport(x + 1, y + 1, w - 2, h - 2)
      gl.setScissor(x + 1, y + 1, w - 2, h - 2)
      gl.setClearColor(transparent ? '#000000' : i % 2 ? '#1d2229' : '#1a1e25', transparent ? 0 : 1)
      gl.clear()
      gl.render(scene, cam)
    })
    gl.setScissorTest(false)
    gl.setViewport(0, 0, size.width, size.height)
    cam.aspect = aspect
    cam.updateProjectionMatrix()
  }, 1)

  return (
    <>
      {cells.map((cell, i) => (
        <Fragment key={cell.key}>
          {createPortal(
            <>
              <ambientLight intensity={0.8} />
              <directionalLight position={[6, 10, 6]} intensity={1.6} />
              <directionalLight position={[-5, 4, -6]} intensity={0.4} />
              <group
                ref={(g) => {
                  if (g && i === 0) nodeObjects.set('lab:subject', g)
                }}
              >
                <Subject type={type} props={cell.props} />
              </group>
            </>,
            scenes[i],
            { events: { enabled: false } },
          )}
        </Fragment>
      ))}
    </>
  )
}
