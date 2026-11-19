import { useState } from 'react'
import type { Report } from '../../analysis/report'
import type { StoredItem } from '../../analysis/storage'
import { DataTable, type Column } from '../DataTable'
import { int } from '../format'

const columns: Column<StoredItem>[] = [
  { key: 'name', header: 'Item', render: (s) => s.name, sort: (s) => s.name },
  { key: 'total', header: 'Total', render: (s) => int(s.total), sort: (s) => s.total, numeric: true },
  { key: 'containers', header: 'Containers', render: (s) => (s.containers ? int(s.containers) : ''), sort: (s) => s.containers, numeric: true },
  { key: 'trains', header: 'Trains', render: (s) => (s.trains ? int(s.trains) : ''), sort: (s) => s.trains, numeric: true },
  { key: 'depot', header: 'Dimensional Depot', render: (s) => (s.depot ? int(s.depot) : ''), sort: (s) => s.depot, numeric: true },
]

export function Storage({ report }: { report: Report }) {
  const [query, setQuery] = useState('')
  const { items, containerCount, wagonCount } = report.storage
  const rows = query ? items.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())) : items

  return (
    <section>
      <div className="toolbar">
        <p className="note">
          Items across {int(containerCount)} storage containers, {int(wagonCount)} freight wagons and the Dimensional Depot.
          Fluids in tanks aren't counted yet.
        </p>
        <input type="search" placeholder="Filter items" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <DataTable rows={rows} columns={columns} rowKey={(s) => s.item} initialSort={{ key: 'total', desc: true }} />
    </section>
  )
}
