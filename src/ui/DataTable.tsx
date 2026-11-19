import { Fragment, useState, type ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  /** Makes the column sortable. */
  sort?: (row: T) => number | string
  numeric?: boolean
}

interface Props<T> {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  initialSort?: { key: string; desc: boolean }
  /** Content shown under a row when it is clicked. */
  expand?: (row: T) => ReactNode
  rowClass?: (row: T) => string | undefined
  empty?: string
}

export function DataTable<T>({ rows, columns, rowKey, initialSort, expand, rowClass, empty }: Props<T>) {
  const [sort, setSort] = useState(initialSort)
  const [open, setOpen] = useState<string | null>(null)

  const col = columns.find((c) => c.key === sort?.key)
  const sorted = col?.sort
    ? [...rows].sort((a, b) => {
        const x = col.sort!(a)
        const y = col.sort!(b)
        const cmp = typeof x === 'string' ? x.localeCompare(String(y)) : x - (y as number)
        return sort!.desc ? -cmp : cmp
      })
    : rows

  const clickHeader = (c: Column<T>) => {
    if (!c.sort) return
    // Numbers sort high-to-low first, text A-Z first.
    const firstDesc = c.numeric ?? false
    setSort(sort?.key === c.key ? { key: c.key, desc: !sort.desc } : { key: c.key, desc: firstDesc })
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={[c.numeric && 'num', c.sort && 'sortable'].filter(Boolean).join(' ')}
                onClick={() => clickHeader(c)}
                aria-sort={sort?.key === c.key ? (sort.desc ? 'descending' : 'ascending') : undefined}
              >
                {c.header}
                {sort?.key === c.key && <span className="sort-arrow">{sort.desc ? '▾' : '▴'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="muted">{empty ?? 'Nothing here.'}</td>
            </tr>
          )}
          {sorted.map((row) => {
            const k = rowKey(row)
            const isOpen = open === k
            return (
              <Fragment key={k}>
                <tr
                  className={[expand && 'expandable', isOpen && 'open', rowClass?.(row)].filter(Boolean).join(' ')}
                  onClick={expand ? () => setOpen(isOpen ? null : k) : undefined}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={c.numeric ? 'num' : undefined}>{c.render(row)}</td>
                  ))}
                </tr>
                {isOpen && expand && (
                  <tr className="detail">
                    <td colSpan={columns.length}>{expand(row)}</td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function Bar({ value, tone }: { value: number; tone?: 'good' | 'warn' | 'bad' }) {
  const t = tone ?? (value < 0.5 ? 'bad' : value < 0.9 ? 'warn' : 'good')
  return (
    <div className="bar">
      <div className={`bar-fill ${t}`} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
      <span>{Math.round(value * 100)}%</span>
    </div>
  )
}
