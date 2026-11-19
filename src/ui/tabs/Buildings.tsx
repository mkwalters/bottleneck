import { useState } from 'react'
import type { Report } from '../../analysis/report'
import { DataTable, type Column } from '../DataTable'
import { int } from '../format'

type Row = { building: string; count: number }

const columns: Column<Row>[] = [
  { key: 'building', header: 'Building', render: (b) => b.building, sort: (b) => b.building },
  { key: 'count', header: 'Count', render: (b) => int(b.count), sort: (b) => b.count, numeric: true },
]

export function Buildings({ report }: { report: Report }) {
  const [query, setQuery] = useState('')
  const rows = query
    ? report.buildingCounts.filter((b) => b.building.toLowerCase().includes(query.toLowerCase()))
    : report.buildingCounts
  const total = report.buildingCounts.reduce((s, b) => s + b.count, 0)

  return (
    <section className="narrow">
      <div className="toolbar">
        <p className="note">{int(total)} buildings of {report.buildingCounts.length} types.</p>
        <input type="search" placeholder="Filter buildings" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <DataTable rows={rows} columns={columns} rowKey={(b) => b.building} initialSort={{ key: 'count', desc: true }} />
    </section>
  )
}
