import type { Report } from '../../analysis/report'
import { idleMachines, notProduced, productionLines, shortfalls } from '../insights'
import { int, mw, pct, rate, unit } from '../format'
import type { Tab } from '../../App'

export function Overview({ report, go }: { report: Report; go: (t: Tab) => void }) {
  const lines = productionLines(report)
  const machines = report.machines.filter((m) => m.kind === 'manufacturer' && m.recipeClass)
  const avg = machines.reduce((s, m) => s + m.productivity, 0) / Math.max(1, machines.length)
  const short = shortfalls(report.items)
  const missing = notProduced(report.items)
  const idle = idleMachines(report.machines)
  const struggling = lines
    .filter((l) => l.avgProductivity < 0.5)
    .sort((a, b) => b.machines.length * (1 - b.avgProductivity) - a.machines.length * (1 - a.avgProductivity))
  const capacity = report.circuits.reduce((s, c) => s + c.capacity, 0)
  const demandMax = report.circuits.reduce((s, c) => s + c.demandMax, 0)
  const demandNow = report.circuits.reduce((s, c) => s + c.demandNow, 0)
  const overloaded = report.circuits.filter((c) => c.demandMax - c.capacity > 1)
  const unusedGen = report.circuits.filter((c) => c.generators > 0 && c.demandMax === 0)

  return (
    <>
      <div className="stats">
        <Stat value={pct(avg)} label="average productivity" />
        <Stat value={int(machines.length)} label="machines with a recipe" />
        <Stat value={int(short.length + missing.length)} label="items in short supply" />
        <Stat value={`${mw(demandMax)} / ${mw(capacity)}`} label="peak demand / capacity" />
      </div>

      <section>
        <h2>What to fix</h2>
        <ul className="issues">
          {short.slice(0, 6).map((s) => (
            <li key={s.flow.item}>
              <strong>{s.flow.name}</strong> is short: you make {rate(s.flow.produced)} {unit(s.flow.fluid)}/min but
              your lines need {rate(s.flow.consumed)} {unit(s.flow.fluid)}/min ({pct(s.coverage)} covered).
            </li>
          ))}
          {missing.length > 0 && (
            <li>
              <strong>{missing.map((f) => f.name).join(', ')}</strong> {missing.length > 1 ? 'are' : 'is'} used
              but not made anywhere. Fed by hand, or from storage?
            </li>
          )}
          {struggling.slice(0, 4).map((l) => (
            <li key={l.key}>
              <strong>{l.recipe}</strong> ({l.machines.length} × {l.building}) averages {pct(l.avgProductivity)}
              {l.shortInputs.length > 0
                ? `, short on ${l.shortInputs.join(', ')}`
                : '. The factory makes enough of its inputs overall, so check its local supply, ore nodes, or whether its output is backing up'}.
            </li>
          ))}
          {overloaded.map((c) => (
            <li key={c.id}>
              <strong>Power circuit #{c.id}</strong> can draw {mw(c.demandMax)} at full tilt but only has {mw(c.capacity)} of
              generators{c.storeCapacity > 0 ? ', so it relies on batteries' : ', so it may trip its fuse'}.
            </li>
          ))}
          {idle.noRecipe.length > 0 && (
            <li><strong>{idle.noRecipe.length} machine{idle.noRecipe.length > 1 ? 's' : ''}</strong> {idle.noRecipe.length > 1 ? 'have' : 'has'} no recipe set.</li>
          )}
          {idle.stopped.length > 0 && (
            <li><strong>{idle.stopped.length} machine{idle.stopped.length > 1 ? 's' : ''}</strong> with a recipe made nothing in the last 5 minutes.</li>
          )}
          {idle.noFuel.length > 0 && (
            <li><strong>{idle.noFuel.length} generator{idle.noFuel.length > 1 ? 's' : ''}</strong> {idle.noFuel.length > 1 ? 'have' : 'has'} no fuel.</li>
          )}
          {unusedGen.map((c) => (
            <li key={c.id}>
              <strong>Power circuit #{c.id}</strong> has {c.generators} generator{c.generators > 1 ? 's' : ''} ({mw(c.capacity)}) but nothing using the power.
            </li>
          ))}
        </ul>
        <p className="note">
          <button className="link" onClick={() => go('items')}>All item flows</button> ·{' '}
          <button className="link" onClick={() => go('production')}>All production lines</button> ·{' '}
          <button className="link" onClick={() => go('power')}>Power</button>
        </p>
      </section>

      <section>
        <h2>Power right now</h2>
        <p className="note">
          The factory was drawing {mw(demandNow)} when you saved, out of {mw(capacity)} of generators.
        </p>
      </section>
    </>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      {label}
    </div>
  )
}
