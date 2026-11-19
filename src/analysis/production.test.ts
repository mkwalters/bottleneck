import { describe, expect, it } from 'vitest'
import type { Machine } from './machines'
import { isDeficit, itemBalance, machineRates } from './production'

const machine = (over: Partial<Machine>): Machine => ({
  id: Math.random().toString(36),
  kind: 'manufacturer',
  buildingClass: 'Build_ConstructorMk1_C',
  building: 'Constructor',
  recipeClass: null,
  recipe: null,
  clock: 1,
  boost: 1,
  productivity: 1,
  paused: false,
  powerNow: 0,
  powerMax: 0,
  powerCapacity: 0,
  fuelClass: null,
  position: null,
  ...over,
})

const rateOf = (rates: [string, number][] | undefined, item: string) => rates?.find(([i]) => i === item)?.[1]

describe('machineRates', () => {
  it('uses recipe rates at 100% clock', () => {
    // Iron Plate: 3 Iron Ingot -> 2 Iron Plate every 6 s = 30 in, 20 out per minute.
    const r = machineRates(machine({ recipeClass: 'Recipe_IronPlate_C' }))
    expect(rateOf(r?.in, 'Desc_IronIngot_C')).toBeCloseTo(30)
    expect(rateOf(r?.out, 'Desc_IronPlate_C')).toBeCloseTo(20)
  })

  it('scales with clock speed', () => {
    const r = machineRates(machine({ recipeClass: 'Recipe_IronPlate_C', clock: 2.5 }))
    expect(rateOf(r?.out, 'Desc_IronPlate_C')).toBeCloseTo(50)
  })

  it('applies somersloop boost to outputs only', () => {
    const r = machineRates(machine({ recipeClass: 'Recipe_IronPlate_C', boost: 2 }))
    expect(rateOf(r?.in, 'Desc_IronIngot_C')).toBeCloseTo(30)
    expect(rateOf(r?.out, 'Desc_IronPlate_C')).toBeCloseTo(40)
  })

  it('returns fluid rates in m³', () => {
    // Plastic: 3 m³ Crude Oil -> 2 Plastic + 1 m³ Heavy Oil Residue every 6 s.
    const r = machineRates(machine({ buildingClass: 'Build_OilRefinery_C', recipeClass: 'Recipe_Plastic_C' }))
    expect(rateOf(r?.in, 'Desc_LiquidOil_C')).toBeCloseTo(30)
    expect(rateOf(r?.out, 'Desc_HeavyOilResidue_C')).toBeCloseTo(10)
  })

  it('burns coal and water in coal generators', () => {
    const r = machineRates(
      machine({ kind: 'generator', buildingClass: 'Build_GeneratorCoal_C', powerCapacity: 75, fuelClass: 'Desc_Coal_C' }),
    )
    expect(rateOf(r?.in, 'Desc_Coal_C')).toBeCloseTo(15)
    expect(rateOf(r?.in, 'Desc_Water_C')).toBeCloseTo(45)
  })

  it('burns 20 m³ of fuel per minute in a fuel generator', () => {
    const r = machineRates(
      machine({ kind: 'generator', buildingClass: 'Build_GeneratorFuel_C', powerCapacity: 250, fuelClass: 'Desc_LiquidFuel_C' }),
    )
    expect(rateOf(r?.in, 'Desc_LiquidFuel_C')).toBeCloseTo(20)
  })

  it('ignores generators with no fuel loaded', () => {
    expect(machineRates(machine({ kind: 'generator', buildingClass: 'Build_GeneratorCoal_C', powerCapacity: 75 }))).toBeNull()
  })

  it('pumps 120 m³ of water per minute', () => {
    const r = machineRates(machine({ kind: 'extractor', buildingClass: 'Build_WaterPump_C' }))
    expect(rateOf(r?.out, 'Desc_Water_C')).toBeCloseTo(120)
  })

  it('has no rates for machines without a recipe', () => {
    expect(machineRates(machine({}))).toBeNull()
  })
})

describe('itemBalance', () => {
  it('flags items consumed faster than they are made', () => {
    const items = itemBalance([
      machine({ recipeClass: 'Recipe_IronPlate_C' }), // makes 20 plates
      machine({ buildingClass: 'Build_AssemblerMk1_C', recipeClass: 'Recipe_IronPlateReinforced_C' }), // uses 30 plates
    ])
    const plates = items.find((f) => f.item === 'Desc_IronPlate_C')!
    expect(plates.produced).toBeCloseTo(20)
    expect(plates.consumed).toBeCloseTo(30)
    expect(isDeficit(plates)).toBe(true)
  })

  it('weights actual rates by productivity', () => {
    const items = itemBalance([machine({ recipeClass: 'Recipe_IronPlate_C', productivity: 0.25 })])
    expect(items.find((f) => f.item === 'Desc_IronPlate_C')!.producedActual).toBeCloseTo(5)
  })

  it('never flags raw resources as deficits', () => {
    const items = itemBalance([machine({ buildingClass: 'Build_SmelterMk1_C', recipeClass: 'Recipe_IngotIron_C' })])
    expect(isDeficit(items.find((f) => f.item === 'Desc_OreIron_C')!)).toBe(false)
  })
})
