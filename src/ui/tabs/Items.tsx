import { useState } from 'react'
import type { Report } from '../../analysis/report'
import { isDeficit, type ItemFlow } from '../../analysis/production'
import { DataTable, type Column } from '../DataTable'
import { pct, rate, signed } from '../format'
import { itemUses, type ItemUse } from '../insights'
import type { Machine } from '../../analysis/machines'

type Filter = 'all' | 'short' | 'surplus' | 'raw'

const columns: Column<ItemFlow>[] = [
  { key: 'name', header: 'Item', render: (f) => <>{f.name}{f.fluid && <span className="muted"> m³</span>}</>, sort: (f) => f.name },
  {
    key: 'produced',
    header: 'Made /min',
    render: (f) => (f.resource ? <span className="muted" title="Extraction rates depend on node purity, which isn't in the save">mined</span> : rate(f.produced)),
    sort: (f) => f.produced,
    numeric: true,
  },
  { key: 'consumed', header: 'Used /min', render: (f) => rate(f.consumed), sort: (f) => f.consumed, numeric: true },
  {
    key: 'net',
    header: 'Net',
    render: (f) => (f.resource ? '' : <span className={isDeficit(f) ? 'bad-text' : ''}>{signed(f.produced - f.consumed)}</span>),
    sort: (f) => (f.resource ? 0 : f.produced - f.consumed),
    numeric: true,
  },
  { key: 'pa', header: 'Actually made', render: (f) => (f.resource ? '' : rate(f.producedActual)), sort: (f) => f.producedActual, numeric: true },
  { key: 'ca', header: 'Actually used', render: (f) => rate(f.consumedActual), sort: (f) => f.consumedActual, numeric: true },
]

export function Items({ report }: { report: Report }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const rows = report.items.filter((f) => {
    if (query && !f.name.toLowerCase().includes(query.toLowerCase())) return false
    if (filter === 'short') return isDeficit(f)
    if (filter === 'surplus') return !f.resource && f.produced - f.consumed > 0.01
    if (filter === 'raw') return f.resource
    return true
  })

  const counts = {
    all: report.items.length,
    short: report.items.filter(isDeficit).length,
    surplus: report.items.filter((f) => !f.resource && f.produced - f.consumed > 0.01).length,
    raw: report.items.filter((f) => f.resource).length,
  }

  return (
    <section>
      <p className="note">
        "Made" and "Used" are what your machines would do at 100% productivity, from recipe rates and clock speeds.
        "Actually" columns weight each machine by its measured productivity. A negative net means some of your lines
        can never run flat out. Click an item to see what makes and uses it.
      </p>
      <div className="toolbar">
        <div className="chips">
          {(['all', 'short', 'surplus', 'raw'] as Filter[]).map((f) => (
            <button key={f} className={filter === f ? 'chip active' : 'chip'} onClick={() => setFilter(f)}>
              {{ all: 'All', short: 'Short', surplus: 'Surplus', raw: 'Raw resources' }[f]} <span className="muted">{counts[f]}</span>
            </button>
          ))}
        </div>
        <input type="search" placeholder="Filter items" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(f) => f.item}
        initialSort={{ key: 'name', desc: false }}
        expand={(f) => <ItemDetail machines={report.machines} flow={f} />}
      />
    </section>
  )
}

function ItemDetail({ machines, flow }: { machines: Machine[]; flow: ItemFlow }) {
  const { producers, consumers } = itemUses(machines, flow.item)
  return (
    <div className="item-detail">
      <UseList title="Made by" uses={producers} empty={flow.resource ? 'Mined or extracted.' : 'Nothing in your factory makes this.'} />
      <UseList title="Used by" uses={consumers} empty="Nothing in your factory uses this." />
    </div>
  )
}

function UseList({ title, uses, empty }: { title: string; uses: ItemUse[]; empty: string }) {
  return (
    <div>
      <h4>{title}</h4>
      {uses.length === 0 ? (
        <p className="note">{empty}</p>
      ) : (
        <table className="compact">
          <tbody>
            {uses.map((u) => (
              <tr key={u.building + u.label}>
                <td>
                  {u.label} <span className="muted">· {u.count} × {u.building} at {pct(u.avgProductivity)}</span>
                </td>
                <td className="num">{rate(u.actual)} <span className="muted">of {rate(u.perMin)} /min</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
