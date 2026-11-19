import type { Report } from '../../analysis/report'
import type { PowerCircuit } from '../../analysis/power'
import { int, mw } from '../format'

export function Power({ report }: { report: Report }) {
  return (
    <section>
      <p className="note">
        One card per power circuit. Peak demand assumes every machine runs flat out at its clock speed; "drawing now" is
        what the game recorded when you saved. Lights, stations and trains count at their current draw.
      </p>
      <div className="cards">
        {report.circuits.map((c) => (
          <CircuitCard key={c.id} c={c} />
        ))}
      </div>
    </section>
  )
}

function CircuitCard({ c }: { c: PowerCircuit }) {
  const headroom = c.capacity - c.demandMax
  const scale = Math.max(c.capacity, c.demandMax, 1)
  const over = headroom < -1
  const unused = c.demandMax < 1
  const tone = unused ? 'muted' : over ? 'bad' : headroom < c.capacity * 0.1 ? 'warn' : 'good'
  const label = c.generators === 0 ? 'no generators' : unused ? 'unused' : over ? `${mw(-headroom)} over` : `${mw(headroom)} spare`

  return (
    <div className="card">
      <div className="card-head">
        <h3>Circuit #{c.id}</h3>
        <span className={`pill ${tone}`}>{label}</span>
      </div>

      <div className="meter" title="Now / peak demand vs capacity">
        <div className="meter-peak" style={{ width: `${(c.demandMax / scale) * 100}%` }} />
        <div className="meter-now" style={{ width: `${(c.demandNow / scale) * 100}%` }} />
        <div className="meter-cap" style={{ left: `${(c.capacity / scale) * 100}%` }} />
      </div>

      <dl className="kv">
        <dt>Capacity</dt><dd>{mw(c.capacity)} <span className="muted">from {c.generators} generator{c.generators === 1 ? '' : 's'}</span></dd>
        <dt>Peak demand</dt><dd>{mw(c.demandMax)}</dd>
        <dt>Drawing now</dt><dd>{mw(c.demandNow)}</dd>
        {c.batteries > 0 && (
          <>
            <dt>Batteries</dt>
            <dd>{int(c.stored)} / {int(c.storeCapacity)} MWh <span className="muted">in {c.batteries}</span></dd>
          </>
        )}
      </dl>

      {c.topConsumers.length > 0 && (
        <table className="compact">
          <tbody>
            {c.topConsumers.map((t) => (
              <tr key={t.building}>
                <td>{t.building} <span className="muted">× {t.count}</span></td>
                <td className="num">{mw(t.mw)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
