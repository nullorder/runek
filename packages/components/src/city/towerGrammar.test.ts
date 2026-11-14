import { describe, expect, it } from 'vitest'
import { buildTower, ERAS, planTower, type TowerPlanInput } from './towerGrammar'

const INPUT: TowerPlanInput = {
  seed: 7,
  width: 16,
  depth: 14,
  height: 60,
  shopfronts: true,
  frontage: ['+z', '+x'],
}

describe('planTower', () => {
  it('gives the same plan for the same props and seed', () => {
    expect(planTower(INPUT)).toEqual(planTower({ ...INPUT }))
  })

  it('gives a different plan for another seed', () => {
    expect(planTower({ ...INPUT, seed: 8 })).not.toEqual(planTower(INPUT))
  })

  it('honours the props it is given over the seed', () => {
    const plan = planTower({ ...INPUT, era: 'glass', lit: 0.5, trim: 'none' })
    expect(ERAS[plan.era]).toBe('glass')
    expect(plan.lit).toBe(0.5)
    expect(plan.trim).toBe('none')
    expect(plan.main).toBe(0)
  })

  it('builds a squat block with no shaft', () => {
    const plan = planTower({ ...INPUT, height: 20 })
    expect(plan.hasShaft).toBe(false)
    expect(plan.podium).toBe(20)
  })

  it('builds the same mesh from the same plan', () => {
    const a = buildTower(planTower(INPUT), '#8a8478')
    const b = buildTower(planTower(INPUT), '#8a8478')
    expect(a.position).toEqual(b.position)
    expect(a.aLook).toEqual(b.aLook)
    expect(a.index.length % 6).toBe(0)
  })
})
