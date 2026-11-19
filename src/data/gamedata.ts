import raw from './gamedata.json'
import type { GameData } from './types'

export const gameData = raw as unknown as GameData

/** "EncasedIndustrialBeam" -> "Encased Industrial Beam". Fallback for classes missing from the Docs. */
export const humanize = (s: string): string =>
  s
    .replace(/^(Build|Desc|Recipe|BP)_/i, '')
    .replace(/_C$/, '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .trim()

export const itemName = (cls: string) => gameData.items[cls]?.name ?? humanize(cls)
export const buildingName = (cls: string) => gameData.buildings[cls]?.name ?? humanize(cls)
export const recipeName = (cls: string) => gameData.recipes[cls]?.name ?? humanize(cls)
