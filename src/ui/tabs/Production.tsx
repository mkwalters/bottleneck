import type { Report } from '../../analysis/report'
import type { Machine } from '../../analysis/machines'
import { Bar, DataTable, type Column } from '../DataTable'
import { coords, pct, rate } from '../format'
import { productionLines, type ProductionLine } from '../insights'

const lineColumns: Column<ProductionLine>[] = [
  { key: 'recipe', header: 'Recipe', render: (l) => l.recipe, sort: (l) => l.recipe },
  { key: 'building', header: 'Building', render: (l) => <span className="muted">{l.building}</span>, sort: (l) => l.building },
  { key: 'count', header: 'Machines', render: (l) => l.machines.length, sort: (l) => l.machines.length, numeric: true },
  { key: 'prod', header: 'Avg productivity', render: (l) => <Bar value={l.avgProductivity} />, sort: (l) => l.avgProductivity, numeric: true },
  {
    key: 'output',
    header: 'Output /min',
    render: (l) => (
      <span title={`Up to ${rate(l.outputMax)} /min at 100% productivity`}>
        {rate(l.outputActual)} <span className="muted">of {rate(l.outputMax)}</span>
      </span>
    ),
    sort: (l) => l.outputActual,
    numeric: true,
  },
  { key: 'short', header: 'Short on', render: (l) => <span className="bad-text">{l.shortInputs.join(', ')}</span>, sort: (l) => l.shortInputs.length, numeric: true },
  { key: 'oc', header: 'Overclocked', render: (l) => l.overclocked || '', sort: (l) => l.overclocked, numeric: true },
]

const machineColumns: Column<Machine>[] = [
  { key: 'prod', header: 'Productivity', render: (m) => <Bar value={m.productivity} />, sort: (m) => m.productivity, numeric: true },
  { key: 'clock', header: 'Clock', render: (m) => pct(m.clock), sort: (m) => m.clock, numeric: true },
  { key: 'pos', header: 'Location (x, y, z in m)', render: (m) => <span className="mono">{coords(m.position)}</span> },
]

export function Production({ report }: { report: Report }) {
  const lines = productionLines(report)
  return (
    <section>
      <p className="note">
        Every recipe you run, grouped by building. Productivity is the share of the last ~5 minutes each machine spent
        producing, as measured by the game; low numbers mean starved inputs or backed-up outputs. "Short on" lists inputs
        the whole factory makes less of than it uses. Click a row to see its machines.
      </p>
      <DataTable
        rows={lines}
        columns={lineColumns}
        rowKey={(l) => l.key}
        initialSort={{ key: 'prod', desc: true }}
        expand={(l) => (
          <DataTable
            rows={l.machines}
            columns={machineColumns}
            rowKey={(m) => m.id}
            initialSort={{ key: 'prod', desc: true }}
          />
        )}
      />
    </section>
  )
}
