export const pct = (n: number) => `${Math.round(n * 100)}%`

export const int = (n: number) => Math.round(n).toLocaleString()

/** Per-minute rate with sensible precision. */
export const rate = (n: number) => {
  const abs = Math.abs(n)
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2
  return Number(n.toFixed(digits)).toLocaleString()
}

export const signed = (n: number) => (n > 0 ? '+' : '') + rate(n)

export const unit = (fluid: boolean) => (fluid ? 'm³' : '')

export const mw = (n: number) =>
  Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)} GW` : `${Math.round(n).toLocaleString()} MW`

export const coords = (p: [number, number, number] | null) =>
  p ? `${Math.round(p[0])}, ${Math.round(p[1])}, ${Math.round(p[2])}` : '—'
