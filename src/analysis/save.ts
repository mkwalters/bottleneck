import type { SatisfactorySave } from '@etothepii/satisfactory-file-parser'

// Loosely typed view of a parsed save object. The parser's property types are a
// large union, and we only read a handful of fields.
export interface RawProperty {
  value?: unknown
  values?: unknown[]
  properties?: Record<string, RawProperty | undefined>
}

export interface RawObject {
  typePath: string
  instanceName: string
  properties?: Record<string, RawProperty | undefined>
}

/** "/Game/.../Build_AssemblerMk1.Build_AssemblerMk1_C" -> "Build_AssemblerMk1_C" */
export const classOf = (path: string): string => path.split('.').pop() ?? path

/**
 * "Persistent_Level:PersistentLevel.Build_X_C_123.PowerConnection" -> "Persistent_Level:PersistentLevel.Build_X_C_123"
 */
export const ownerOf = (componentPath: string): string => componentPath.slice(0, componentPath.lastIndexOf('.'))

export const num = (o: { properties?: RawObject['properties'] } | undefined, key: string): number | undefined => {
  const v = o?.properties?.[key]?.value
  return typeof v === 'number' ? v : undefined
}

/** Path of an ObjectProperty reference, such as a recipe or a component. */
export const ref = (o: { properties?: RawObject['properties'] } | undefined, key: string): string | undefined => {
  const v = o?.properties?.[key]?.value as { pathName?: string } | undefined
  return v?.pathName || undefined
}

export const array = (o: { properties?: RawObject['properties'] } | undefined, key: string): RawProperty[] =>
  (o?.properties?.[key]?.values ?? []) as RawProperty[]

export class SaveIndex {
  readonly objects: RawObject[]
  private readonly byName: Map<string, RawObject>

  constructor(save: SatisfactorySave) {
    this.objects = Object.values(save.levels).flatMap((l) => l.objects) as unknown as RawObject[]
    this.byName = new Map(this.objects.map((o) => [o.instanceName, o]))
  }

  get(path: string | undefined): RawObject | undefined {
    return path ? this.byName.get(path) : undefined
  }

  /** Follows an ObjectProperty to the object it points at, such as a machine's powerInfo component. */
  follow(o: RawObject, key: string): RawObject | undefined {
    return this.get(ref(o, key))
  }
}
