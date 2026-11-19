import type { SatisfactorySave } from '@etothepii/satisfactory-file-parser'
import { buildingName } from '../data/gamedata'
import { readMachines, type Machine } from './machines'
import { itemBalance, type ItemFlow } from './production'
import { readPower, type PowerCircuit } from './power'
import { classOf, SaveIndex } from './save'
import { readStorage, type StorageSummary } from './storage'

export interface Report {
  saveName: string
  sessionName: string
  playHours: number
  saveVersion: number
  buildVersion: number
  savedAt: number | null
  objectCount: number
  buildingCounts: { building: string; count: number }[]
  machines: Machine[]
  items: ItemFlow[]
  circuits: PowerCircuit[]
  storage: StorageSummary
}

function countBuildings(index: SaveIndex) {
  const counts = new Map<string, number>()
  for (const o of index.objects) {
    if (!o.typePath.includes('/Buildable/')) continue
    const cls = classOf(o.typePath)
    if (!cls.startsWith('Build_')) continue
    const name = buildingName(cls)
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts].map(([building, count]) => ({ building, count })).sort((a, b) => b.count - a.count)
}

/** The header stores the save time as a millisecond Unix timestamp string. */
function savedAtMs(v: string | number | undefined): number | null {
  const ms = Number(v)
  return Number.isFinite(ms) && ms > 0 ? ms : null
}

export function buildReport(saveName: string, save: SatisfactorySave): Report {
  const index = new SaveIndex(save)
  const machines = readMachines(index)
  return {
    saveName,
    sessionName: save.header.sessionName,
    playHours: save.header.playDurationSeconds / 3600,
    saveVersion: save.header.saveVersion,
    buildVersion: save.header.buildVersion,
    savedAt: savedAtMs(save.header.saveDateTime),
    objectCount: index.objects.length,
    buildingCounts: countBuildings(index),
    machines,
    items: itemBalance(machines),
    circuits: readPower(index, machines),
    storage: readStorage(index),
  }
}
