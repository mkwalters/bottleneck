import { gameData, buildingName, recipeName } from '../data/gamedata'
import { classOf, num, ref, type RawObject, type SaveIndex } from './save'

export type MachineKind = 'manufacturer' | 'extractor' | 'generator'

export interface Machine {
  id: string
  kind: MachineKind
  buildingClass: string
  building: string
  recipeClass: string | null
  recipe: string | null
  /** Clock speed, 1 = 100%. */
  clock: number
  /** Somersloop output multiplier, 1 = none. */
  boost: number
  /** Fraction of the last ~5 minute window the machine spent producing, 0..1. */
  productivity: number
  paused: boolean
  /** Power the machine was drawing when the game saved, MW. */
  powerNow: number
  /** Power the machine draws while running at its clock speed, MW. */
  powerMax: number
  /** Generators: MW at the current clock speed. */
  powerCapacity: number
  /** Generators: the fuel loaded. */
  fuelClass: string | null
  /** Map coordinates in metres. */
  position: [number, number, number] | null
}

function kindOf(buildingClass: string): MachineKind {
  const b = gameData.buildings[buildingClass]
  if (b?.powerProduction) return 'generator'
  if (b?.extractCycle) return 'extractor'
  if (/Generator/.test(buildingClass)) return 'generator'
  if (/Miner|Pump|Extractor/.test(buildingClass)) return 'extractor'
  return 'manufacturer'
}

function productivityOf(o: RawObject): number {
  // Unset properties mean the default value (0).
  const lastDur = num(o, 'mLastProductivityMeasurementDuration') ?? 0
  const lastProd = num(o, 'mLastProductivityMeasurementProduceDuration') ?? 0
  const curDur = num(o, 'mCurrentProductivityMeasurementDuration') ?? 0
  const curProd = num(o, 'mCurrentProductivityMeasurementProduceDuration') ?? 0
  const p = lastDur > 0 ? lastProd / lastDur : curDur > 0 ? curProd / curDur : 0
  return Math.min(1, Math.max(0, p))
}

/** Anything the game tracks productivity for is a production machine: manufacturers, extractors and generators. */
export const isMachine = (o: RawObject) =>
  o.properties?.mProductivityMonitorEnabled !== undefined ||
  num(o, 'mLastProductivityMeasurementDuration') !== undefined ||
  num(o, 'mCurrentProductivityMeasurementDuration') !== undefined

export function readMachines(index: SaveIndex): Machine[] {
  const machines: Machine[] = []
  for (const o of index.objects) {
    if (!o.typePath.includes('/Buildable/') || !isMachine(o)) continue

    const buildingClass = classOf(o.typePath)
    const data = gameData.buildings[buildingClass]
    const recipePath = ref(o, 'mCurrentRecipe')
    const recipeClass = recipePath ? classOf(recipePath) : null
    const clock = num(o, 'mCurrentPotential') ?? 1
    const boost = num(o, 'mCurrentProductionBoost') ?? 1
    const kind = kindOf(buildingClass)

    // Rated power draw at this clock speed. Variable-power machines (Particle Accelerator etc.)
    // cycle between a min and max that depend on the recipe; use the peak.
    const exponent = data?.powerExponent ?? 1.321929
    const variable = recipeClass ? gameData.recipes[recipeClass]?.variablePower : undefined
    const basePower = variable?.[1] ?? data?.power ?? 0
    const runs = kind !== 'manufacturer' || recipeClass !== null
    const powerMax = runs ? basePower * Math.pow(clock, exponent) * boost * boost : 0

    const powerInfo = index.follow(o, 'mPowerInfo')
    const t = (o as { transform?: { translation?: { x: number; y: number; z: number } } }).transform?.translation
    machines.push({
      id: o.instanceName,
      kind,
      buildingClass,
      building: buildingName(buildingClass),
      recipeClass,
      recipe: recipeClass ? recipeName(recipeClass) : null,
      clock,
      boost,
      productivity: productivityOf(o),
      paused: o.properties?.mIsProductionPaused?.value === true,
      powerNow: num(powerInfo, 'mTargetConsumption') ?? 0,
      powerMax,
      powerCapacity: kind === 'generator' ? (data?.powerProduction ?? 0) * clock : 0,
      fuelClass: ref(o, 'mCurrentFuelClass') ? classOf(ref(o, 'mCurrentFuelClass')!) : null,
      // Unreal units are centimetres.
      position: t ? [t.x / 100, t.y / 100, t.z / 100] : null,
    })
  }
  return machines
}
