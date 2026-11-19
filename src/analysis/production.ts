import { gameData, itemName } from '../data/gamedata'
import type { Machine } from './machines'

export interface ItemFlow {
  item: string
  name: string
  fluid: boolean
  /** Raw resource. Miner and oil output depends on node purity, which isn't in the save. */
  resource: boolean
  /** Per-minute rates at 100% productivity, from recipes and clock speeds. */
  produced: number
  consumed: number
  /** Per-minute rates weighted by each machine's measured productivity. */
  producedActual: number
  consumedActual: number
  producers: number
  consumers: number
}

/** Per-minute input and output of one machine at 100% productivity. */
export interface MachineRates {
  in: [item: string, perMin: number][]
  out: [item: string, perMin: number][]
}

export function machineRates(m: Machine): MachineRates | null {
  if (m.kind === 'manufacturer') {
    const recipe = m.recipeClass ? gameData.recipes[m.recipeClass] : undefined
    if (!recipe || recipe.duration <= 0) return null
    const cyclesPerMin = (60 / recipe.duration) * m.clock
    return {
      in: recipe.in.map(([item, n]) => [item, n * cyclesPerMin]),
      // Somersloops multiply output without using more input.
      out: recipe.out.map(([item, n]) => [item, n * cyclesPerMin * m.boost]),
    }
  }

  if (m.kind === 'generator') {
    const building = gameData.buildings[m.buildingClass]
    // A generator with no fuel loaded burns nothing.
    const fuel = building?.fuels?.find((f) => f.fuel === m.fuelClass)
    const energy = fuel ? gameData.items[fuel.fuel]?.energy : undefined
    if (!fuel || !energy) return null // geothermal: no fuel
    const fuelPerMin = (m.powerCapacity / energy) * 60
    const rates: MachineRates = { in: [[fuel.fuel, fuelPerMin]], out: [] }
    if (fuel.supplemental && building?.supplementalPerMW) {
      rates.in.push([fuel.supplemental, building.supplementalPerMW * m.powerCapacity])
    }
    if (fuel.byproduct && fuel.byproductAmount) rates.out.push([fuel.byproduct, fuelPerMin * fuel.byproductAmount])
    return rates
  }

  // Water extractors are the only extractors with a fixed rate. Miners and oil
  // extractors depend on node purity, which isn't stored in the save.
  if (m.buildingClass === 'Build_WaterPump_C') {
    const b = gameData.buildings[m.buildingClass]
    if (!b?.extractCycle || !b.itemsPerCycle) return null
    return { in: [], out: [['Desc_Water_C', ((60 / b.extractCycle) * b.itemsPerCycle * m.clock) / 1000]] }
  }

  return null
}

export function itemBalance(machines: Machine[]): ItemFlow[] {
  const flows = new Map<string, ItemFlow>()
  const flow = (item: string): ItemFlow => {
    let f = flows.get(item)
    if (!f) {
      const data = gameData.items[item]
      f = {
        item,
        name: itemName(item),
        fluid: !!data?.fluid,
        resource: !!data?.resource && item !== 'Desc_Water_C',
        produced: 0,
        consumed: 0,
        producedActual: 0,
        consumedActual: 0,
        producers: 0,
        consumers: 0,
      }
      flows.set(item, f)
    }
    return f
  }

  for (const m of machines) {
    const rates = machineRates(m)
    if (!rates) continue
    for (const [item, perMin] of rates.out) {
      const f = flow(item)
      f.produced += perMin
      f.producedActual += perMin * m.productivity
      f.producers++
    }
    for (const [item, perMin] of rates.in) {
      const f = flow(item)
      f.consumed += perMin
      f.consumedActual += perMin * m.productivity
      f.consumers++
    }
  }

  return [...flows.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/** Items the factory needs more of than it is built to make. Ignores raw resources. */
export const isDeficit = (f: ItemFlow) => !f.resource && f.consumed - f.produced > 0.01
