import { itemName } from '../data/gamedata'
import { array, classOf, type RawProperty, type SaveIndex } from './save'

export interface StoredItem {
  item: string
  name: string
  total: number
  /** Storage containers, including the player inventory-sized ones. */
  containers: number
  /** Freight wagons on trains. */
  trains: number
  /** Uploaded to the Dimensional Depot. */
  depot: number
}

export interface StorageSummary {
  items: StoredItem[]
  containerCount: number
  wagonCount: number
}

const stackItem = (stack: RawProperty) => {
  const item = stack.properties?.Item?.value as { itemReference?: { pathName?: string } } | undefined
  const count = stack.properties?.NumItems?.value
  return { path: item?.itemReference?.pathName, count: typeof count === 'number' ? count : 0 }
}

export function readStorage(index: SaveIndex): StorageSummary {
  const totals = new Map<string, StoredItem>()
  const add = (path: string, count: number, where: 'containers' | 'trains' | 'depot') => {
    const item = classOf(path)
    const t = totals.get(item) ?? { item, name: itemName(item), total: 0, containers: 0, trains: 0, depot: 0 }
    t.total += count
    t[where] += count
    totals.set(item, t)
  }

  let containerCount = 0
  let wagonCount = 0
  for (const o of index.objects) {
    const inventory = index.follow(o, 'mStorageInventory')
    if (!inventory) continue
    const isWagon = o.typePath.includes('FreightWagon')
    // Skip the player's own inventory and the blueprint designer's.
    if (/StoragePlayer|StorageBlueprint/.test(o.typePath)) continue
    if (isWagon) wagonCount++
    else containerCount++
    for (const stack of array(inventory, 'mInventoryStacks')) {
      const { path, count } = stackItem(stack)
      if (path && count > 0) add(path, count, isWagon ? 'trains' : 'containers')
    }
  }

  const depot = index.objects.find((o) => o.typePath.endsWith('FGCentralStorageSubsystem'))
  for (const entry of array(depot, 'mStoredItems')) {
    const path = (entry.properties?.ItemClass?.value as { pathName?: string } | undefined)?.pathName
    const amount = entry.properties?.Amount?.value
    if (path && typeof amount === 'number' && amount > 0) add(path, amount, 'depot')
  }

  return {
    items: [...totals.values()].sort((a, b) => b.total - a.total),
    containerCount,
    wagonCount,
  }
}
