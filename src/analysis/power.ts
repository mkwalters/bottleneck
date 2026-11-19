import { buildingName, gameData } from '../data/gamedata'
import type { Machine } from './machines'
import { array, classOf, num, ownerOf, type SaveIndex } from './save'

export interface PowerCircuit {
  id: number
  generators: number
  /** Generating capacity at current clock speeds, MW. */
  capacity: number
  /** What the circuit was drawing when the game saved, MW. */
  demandNow: number
  /** What the circuit draws if every machine runs flat out, MW. */
  demandMax: number
  batteries: number
  /** MWh stored / total MWh. */
  stored: number
  storeCapacity: number
  consumers: number
  /** Largest consumers by building type, MW at max. */
  topConsumers: { building: string; count: number; mw: number }[]
}

export function readPower(index: SaveIndex, machines: Machine[]): PowerCircuit[] {
  // Map each building to its circuit via the power connections each circuit lists.
  const circuitOf = new Map<string, number>()
  for (const o of index.objects) {
    if (!o.typePath.endsWith('FGPowerCircuit')) continue
    const id = num(o, 'mCircuitID') ?? -1
    for (const c of array(o, 'mComponents')) {
      const path = (c as { pathName?: string }).pathName
      if (path) circuitOf.set(ownerOf(path), id)
    }
  }

  const machineById = new Map(machines.map((m) => [m.id, m]))
  const circuits = new Map<number, PowerCircuit & { byBuilding: Map<string, { count: number; mw: number }> }>()

  for (const o of index.objects) {
    const powerInfo = index.follow(o, 'mPowerInfo')
    if (!powerInfo) continue
    const id = circuitOf.get(o.instanceName)
    if (id === undefined) continue // not connected to anything

    let c = circuits.get(id)
    if (!c) {
      c = {
        id, generators: 0, capacity: 0, demandNow: 0, demandMax: 0,
        batteries: 0, stored: 0, storeCapacity: 0, consumers: 0, topConsumers: [], byBuilding: new Map(),
      }
      circuits.set(id, c)
    }

    const cls = classOf(o.typePath)
    const m = machineById.get(o.instanceName)
    const storeCapacity = gameData.buildings[cls]?.powerStoreCapacity

    if (m?.kind === 'generator') {
      c.generators++
      c.capacity += m.powerCapacity
    } else if (storeCapacity) {
      c.batteries++
      c.stored += num(o, 'mPowerStore') ?? 0
      c.storeCapacity += storeCapacity
    } else {
      const now = num(powerInfo, 'mTargetConsumption') ?? 0
      // Non-machines (lights, stations, locomotives, ...) have no rated draw we can compute,
      // so their current draw doubles as their max.
      const max = m ? m.powerMax : now
      if (max <= 0 && now <= 0) continue
      c.consumers++
      c.demandNow += now
      c.demandMax += max
      const name = buildingName(cls)
      const b = c.byBuilding.get(name) ?? { count: 0, mw: 0 }
      b.count++
      b.mw += max
      c.byBuilding.set(name, b)
    }
  }

  return [...circuits.values()]
    .filter((c) => c.generators > 0 || c.consumers > 0)
    .map(({ byBuilding, ...c }) => ({
      ...c,
      topConsumers: [...byBuilding]
        .map(([building, b]) => ({ building, ...b }))
        .sort((a, b) => b.mw - a.mw)
        .slice(0, 6),
    }))
    .sort((a, b) => b.capacity + b.demandMax - (a.capacity + a.demandMax))
}
