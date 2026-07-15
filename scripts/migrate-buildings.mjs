#!/usr/bin/env node
// Migrate pre-0.12 `House`/`Room` preset nodes in a world file to the composite
// era by baking each node's props through the old preset layout math into an
// unpacked `Group` arrangement of parts (Wall/Floor/Door/Window/Roof).
//
// Use this when a world placed a house/room with NON-DEFAULT props (size,
// height, roofStyle, colors, doorWidth) — the baked arrangement preserves the
// exact old appearance. Nodes you'd rather modernize can simply stay as
// `{ "type": "House" }` references: they now resolve to the house composite
// (a different, two-level building).
//
// Usage: node scripts/migrate-buildings.mjs <world.json> [--write]
//   (prints the migrated JSON to stdout; --write rewrites the file in place)
import { readFileSync, writeFileSync } from 'node:fs'

const [, , path, flag] = process.argv
if (!path) {
  console.error('usage: node scripts/migrate-buildings.mjs <world.json> [--write]')
  process.exit(1)
}

const data = JSON.parse(readFileSync(path, 'utf8'))
const unit = data.unit ?? 1
let migrated = 0

const keep = (node, extra) => ({
  ...(node.id ? { id: node.id } : {}),
  props: {
    ...(node.props?.position ? { position: node.props.position } : {}),
    ...(node.props?.rotation ? { rotation: node.props.rotation } : {}),
    ...extra,
  },
})

/** The retired House.tsx layout: one storey, door front, side windows, roof. */
function bakeHouse(node) {
  const p = node.props ?? {}
  const [w, d] = p.size ?? [9, 9]
  const height = p.height ?? 3
  const thickness = p.thickness ?? 0.2
  const halfW = (w / 2) * unit
  const halfD = (d / 2) * unit
  const turn = [0, Math.PI / 2, 0]
  const wall = (props) => ({
    type: 'Wall',
    props: { height, thickness, ...(p.wallColor ? { color: p.wallColor } : {}), ...props },
  })
  const windowOpening = { width: 1.3, height: 1.2, sill: 1 }
  return {
    type: 'Group',
    ...keep(node),
    children: [
      { type: 'Floor', props: { position: [0, 0, 0], size: [w, d], thickness } },
      wall({ position: [0, 0, -halfD], width: w }),
      wall({
        position: [0, 0, halfD],
        width: w,
        openings: [{ width: 1, height: 2.1 }],
      }),
      wall({ position: [-halfW, 0, 0], rotation: turn, width: d, openings: [windowOpening] }),
      wall({ position: [halfW, 0, 0], rotation: turn, width: d, openings: [windowOpening] }),
      { type: 'Door', props: { position: [0, 0, halfD], width: 1, height: 2.1, openAngle: -1.1 } },
      {
        type: 'Window',
        props: { position: [-halfW, unit, 0], rotation: turn, width: 1.3, height: 1.2 },
      },
      {
        type: 'Window',
        props: { position: [halfW, unit, 0], rotation: turn, width: 1.3, height: 1.2 },
      },
      {
        type: 'Roof',
        props: {
          position: [0, height * unit, 0],
          size: [w, d],
          style: p.roofStyle ?? 'gable',
          ...(p.roofColor ? { color: p.roofColor } : {}),
        },
      },
    ],
  }
}

/** The retired Room.tsx layout: inset walls, front doorway, optional ceiling. */
function bakeRoom(node) {
  const p = node.props ?? {}
  const [w, d] = p.size ?? [8, 8]
  const height = p.height ?? 3
  const thickness = p.thickness ?? 0.2
  const doorWidth = p.doorWidth ?? 1.4
  const doorHeight = Math.min(2, height - thickness)
  const inW = (w / 2 - thickness / 2) * unit
  const inD = (d / 2 - thickness / 2) * unit
  const turn = [0, Math.PI / 2, 0]
  const wall = (props) => ({
    type: 'Wall',
    props: { height, thickness, ...(p.color ? { color: p.color } : {}), ...props },
  })
  return {
    type: 'Group',
    ...keep(node),
    children: [
      // the old Room floored itself in the wall color
      {
        type: 'Floor',
        props: {
          position: [0, 0, 0],
          size: [w, d],
          thickness,
          ...(p.color ? { color: p.color } : {}),
        },
      },
      wall({ position: [0, 0, -inD], width: w }),
      wall({ position: [-inW, 0, 0], rotation: turn, width: d }),
      wall({ position: [inW, 0, 0], rotation: turn, width: d }),
      wall({
        position: [0, 0, inD],
        width: w,
        openings: [{ width: doorWidth, height: doorHeight }],
      }),
      ...(p.roof
        ? [
            {
              type: 'Floor',
              props: {
                position: [0, (height + thickness) * unit, 0],
                size: [w, d],
                thickness,
                ...(p.color ? { color: p.color } : {}),
              },
            },
          ]
        : []),
    ],
  }
}

function walk(nodes) {
  return nodes.map((node) => {
    const type = node.type?.toLowerCase()
    if (type === 'house') {
      migrated++
      return bakeHouse(node)
    }
    if (type === 'room') {
      migrated++
      return bakeRoom(node)
    }
    return node.children ? { ...node, children: walk(node.children) } : node
  })
}

const out = { ...data, nodes: walk(data.nodes) }
const text = `${JSON.stringify(out, null, 2)}\n`
if (flag === '--write') {
  writeFileSync(path, text)
  console.error(`migrated ${migrated} node(s) in ${path}`)
} else {
  process.stdout.write(text)
  console.error(`\nmigrated ${migrated} node(s) — pass --write to rewrite ${path}`)
}
