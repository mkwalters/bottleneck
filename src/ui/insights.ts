import { gameData, itemName } from '../data/gamedata'
import type { Machine } from '../analysis/machines'
import { isDeficit, machineRates, type ItemFlow } from '../analysis/production'
import type { Report } from '../analysis/report'

/** All machines running one recipe in one building type. */
export interface ProductionLine {
  key: string
  recipe: string
  building: string
  machines: Machine[]
  avgProductivity: number
  under50: number
  overclocked: number
  /** Main product and its per-minute rates. */
  product: string | null
  outputMax: number
  outputActual: number
  /** Inputs the factory makes less of than it consumes. */
  shortInputs: string[]
}

export function productionLines(report: Report): ProductionLine[] {
  const deficits = new Set(report.items.filter(isDeficit).map((f) => f.item))
  const groups = new Map<string, Machine[]>()
  for (const m of report.machines) {
    if (m.kind !== 'manufacturer' || !m.recipeClass) continue
    const key = `${m.buildingClass}|${m.recipeClass}`
    groups.set(key, [...(groups.get(key) ?? []), m])
  }

  return [...groups].map(([key, ms]) => {
    const first = ms[0]
    const recipe = gameData.recipes[first.recipeClass!]
    const productClass = recipe?.out[0]?.[0] ?? null
    let outputMax = 0
    let outputActual = 0
    for (const m of ms) {
      const perMin = machineRates(m)?.out[0]?.[1] ?? 0
      outputMax += perMin
      outputActual += perMin * m.productivity
    }
    return {
      key,
      recipe: first.recipe!,
      building: first.building,
      machines: ms,
      avgProductivity: ms.reduce((s, m) => s + m.productivity, 0) / ms.length,
      under50: ms.filter((m) => m.productivity < 0.5).length,
      overclocked: ms.filter((m) => m.clock > 1).length,
      product: productClass ? itemName(productClass) : null,
      outputMax,
      outputActual,
      shortInputs: (recipe?.in ?? []).filter(([item]) => deficits.has(item)).map(([item]) => itemName(item)),
    }
  })
}

export interface Shortfall {
  flow: ItemFlow
  /** Share of demand the factory is built to supply, 0..1. */
  coverage: number
  missing: number
}

/** Items that are used but made nowhere: hand-fed, from storage, or a missing production line. */
export const notProduced = (items: ItemFlow[]) => items.filter((f) => isDeficit(f) && f.produced === 0)

export function shortfalls(items: ItemFlow[]): Shortfall[] {
  return items
    .filter((f) => isDeficit(f) && f.produced > 0)
    .map((flow) => ({ flow, coverage: flow.produced / flow.consumed, missing: flow.consumed - flow.produced }))
    .sort((a, b) => a.coverage - b.coverage)
}

export interface Idle {
  noRecipe: Machine[]
  noFuel: Machine[]
  stopped: Machine[]
}

export function idleMachines(machines: Machine[]): Idle {
  return {
    noRecipe: machines.filter((m) => m.kind === 'manufacturer' && !m.recipeClass),
    noFuel: machines.filter((m) => m.kind === 'generator' && !m.fuelClass && gameData.buildings[m.buildingClass]?.fuels),
    // Has a recipe but produced nothing in the last measurement window.
    stopped: machines.filter((m) => m.kind === 'manufacturer' && m.recipeClass && m.productivity === 0),
  }
}

export interface ItemUse {
  label: string
  building: string
  count: number
  perMin: number
  actual: number
  avgProductivity: number
}

/** Which recipes (or generators) make and use one item, with their per-minute rates. */
export function itemUses(machines: Machine[], item: string): { producers: ItemUse[]; consumers: ItemUse[] } {
  const producers = new Map<string, ItemUse>()
  const consumers = new Map<string, ItemUse>()
  const add = (map: Map<string, ItemUse>, m: Machine, perMin: number) => {
    const label = m.recipe ?? m.building
    const key = `${m.buildingClass}|${label}`
    const u = map.get(key) ?? { label, building: m.building, count: 0, perMin: 0, actual: 0, avgProductivity: 0 }
    u.avgProductivity = (u.avgProductivity * u.count + m.productivity) / (u.count + 1)
    u.count++
    u.perMin += perMin
    u.actual += perMin * m.productivity
    map.set(key, u)
  }
  for (const m of machines) {
    const rates = machineRates(m)
    if (!rates) continue
    for (const [i, perMin] of rates.out) if (i === item) add(producers, m, perMin)
    for (const [i, perMin] of rates.in) if (i === item) add(consumers, m, perMin)
  }
  const byRate = (a: ItemUse, b: ItemUse) => b.perMin - a.perMin
  return { producers: [...producers.values()].sort(byRate), consumers: [...consumers.values()].sort(byRate) }
}
