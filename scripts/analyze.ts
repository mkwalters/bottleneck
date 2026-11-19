// Runs the same analysis as the app, from the command line.
// Usage: npm run analyze -- path/to/save.sav
import fs from 'node:fs'
import path from 'node:path'
import { Parser } from '@etothepii/satisfactory-file-parser'
import { buildReport } from '../src/analysis/report'
import { isDeficit } from '../src/analysis/production'

const file = process.argv[2] ?? 'public/saves/foo.sav'
const buf = fs.readFileSync(file)
const t = Date.now()
const save = Parser.ParseSave(path.basename(file), buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
const r = buildReport(path.basename(file), save)
const round = (n: number) => Math.round(n * 10) / 10

console.log(`${r.sessionName}: ${r.objectCount} objects, ${r.machines.length} machines, parsed in ${Date.now() - t} ms`)
console.log('saved at', r.savedAt && new Date(r.savedAt).toISOString())
console.log('\nDeficits:')
for (const f of r.items.filter(isDeficit)) console.log(`  ${f.name}: +${round(f.produced)} -${round(f.consumed)} /min`)
console.log('\nRaw resource demand:')
for (const f of r.items.filter((f) => f.resource)) console.log(`  ${f.name}: ${round(f.consumed)} /min`)
console.log('\nPower circuits:')
for (const c of r.circuits)
  console.log(`  #${c.id}: ${c.generators} gens ${round(c.capacity)} MW cap, demand now ${round(c.demandNow)} max ${round(c.demandMax)}, ${c.batteries} batteries ${round(c.stored)}/${c.storeCapacity} MWh`)
console.log('\nStorage:', r.storage.containerCount, 'containers,', r.storage.wagonCount, 'wagons')
for (const s of r.storage.items.slice(0, 10)) console.log(`  ${s.name}: ${s.total} (containers ${s.containers}, trains ${s.trains}, depot ${s.depot})`)
