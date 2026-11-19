// Extracts the recipe, item and building data Bottleneck needs from the game's
// Docs file (CommunityResources/Docs/en-US.json in the Satisfactory install).
//
// Usage: node scripts/extract-gamedata.ts [path/to/en-US.json]
// Writes src/data/gamedata.json. Rerun after game updates.

import fs from 'node:fs'
import path from 'node:path'
import type { GameData, ItemData, RecipeData, BuildingData } from '../src/data/types.ts'

const DEFAULT_DOCS =
  '/mnt/c/Program Files (x86)/Steam/steamapps/common/Satisfactory/CommunityResources/Docs/en-US.json'
const OUT = path.join(import.meta.dirname, '../src/data/gamedata.json')

type DocClass = Record<string, unknown> & { ClassName: string; NativeClass: string }

function readDocs(file: string): DocClass[] {
  const raw = fs.readFileSync(file)
  // The Docs file ships as UTF-16 LE with a BOM.
  const text = raw[0] === 0xff && raw[1] === 0xfe
    ? raw.toString('utf16le').slice(1)
    : raw.toString('utf8').replace(/^﻿/, '')
  const groups = JSON.parse(text) as { NativeClass: string; Classes: DocClass[] }[]
  return groups.flatMap((g) => g.Classes.map((c) => ({ ...c, NativeClass: g.NativeClass })))
}

const num = (v: unknown) => Number.parseFloat(String(v ?? '0')) || 0

/** "/Game/.../Desc_SteelPlate.Desc_SteelPlate_C'" -> "Desc_SteelPlate_C" */
const classOf = (p: string) => p.replace(/['"]/g, '').split('.').pop()!

/** Parses `((ItemClass="...Desc_X_C'",Amount=3),(...))` into [class, amount] pairs. */
function parseAmounts(s: unknown): [string, number][] {
  return [...String(s ?? '').matchAll(/ItemClass="([^"]+)",Amount=([\d.]+)/g)].map((m) => [
    classOf(m[1]),
    Number(m[2]),
  ])
}

const docsPath = process.argv[2] ?? DEFAULT_DOCS
const classes = readDocs(docsPath)

const items: Record<string, ItemData> = {}
for (const c of classes) {
  if (!c.ClassName.startsWith('Desc_') || !c.mDisplayName) continue
  const form = String(c.mForm ?? '')
  const fluid = form === 'RF_LIQUID' || form === 'RF_GAS'
  items[c.ClassName] = {
    name: String(c.mDisplayName),
    ...(fluid && { fluid: true }),
    ...(c.NativeClass.includes('FGResourceDescriptor') && { resource: true }),
    // MJ per item, or per m³ for fluids (the Docs value is per litre).
    ...(num(c.mEnergyValue) > 0 && { energy: num(c.mEnergyValue) * (fluid ? 1000 : 1) }),
  }
}

// Fluid amounts are stored in litres; convert to m³ so every rate is "units per minute".
const scale = ([cls, amount]: [string, number]): [string, number] => [
  cls,
  items[cls]?.fluid ? amount / 1000 : amount,
]

const recipes: Record<string, RecipeData> = {}
for (const c of classes) {
  if (!c.ClassName.startsWith('Recipe_') || !c.mProduct) continue
  const producedIn = String(c.mProducedIn ?? '')
  const building = producedIn.match(/Build_\w+_C/)?.[0]
  if (!building) continue // build-gun, workshop and hand-crafting only
  recipes[c.ClassName] = {
    name: String(c.mDisplayName),
    building,
    duration: num(c.mManufactoringDuration),
    in: parseAmounts(c.mIngredients).map(scale),
    out: parseAmounts(c.mProduct).map(scale),
  }
  // Particle Accelerator, Converter and Quantum Encoder recipes cycle between these MW values.
  const factor = num(c.mVariablePowerConsumptionFactor)
  const constant = num(c.mVariablePowerConsumptionConstant)
  if (constant > 0) recipes[c.ClassName].variablePower = [constant, constant + factor]
}

const buildings: Record<string, BuildingData> = {}
for (const c of classes) {
  if (!c.ClassName.startsWith('Build_') || !c.mDisplayName) continue
  const b: BuildingData = { name: String(c.mDisplayName) }
  if (num(c.mPowerConsumption) > 0) b.power = num(c.mPowerConsumption)
  if (num(c.mPowerConsumptionExponent) > 0) b.powerExponent = num(c.mPowerConsumptionExponent)
  if (num(c.mEstimatedMaximumPowerConsumption) > 0) {
    b.variablePower = [num(c.mEstimatedMininumPowerConsumption), num(c.mEstimatedMaximumPowerConsumption)]
  }
  if (num(c.mPowerProduction) > 0) {
    b.powerProduction = num(c.mPowerProduction)
    // Water etc. per MW, converted from litres/s to m³/min.
    const ratio = num(c.mSupplementalToPowerRatio)
    if (ratio > 0) b.supplementalPerMW = (ratio * 60) / 1000
    if (Array.isArray(c.mFuel)) {
      b.fuels = (c.mFuel as Record<string, string>[]).map((f) => ({
        fuel: f.mFuelClass,
        ...(f.mSupplementalResourceClass && { supplemental: f.mSupplementalResourceClass }),
        ...(f.mByproduct && { byproduct: f.mByproduct, byproductAmount: num(f.mByproductAmount) }),
      }))
    }
  }
  if (num(c.mPowerStoreCapacity) > 0) b.powerStoreCapacity = num(c.mPowerStoreCapacity)
  if (num(c.mExtractCycleTime) > 0) {
    b.extractCycle = num(c.mExtractCycleTime)
    b.itemsPerCycle = num(c.mItemsPerCycle)
  }
  buildings[c.ClassName] = b
}

const data: GameData = { items, recipes, buildings }
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(data))
console.log(
  `Wrote ${OUT}: ${Object.keys(items).length} items, ${Object.keys(recipes).length} recipes, ${Object.keys(buildings).length} buildings`,
)
