/** OVER com 1 casa e vírgula (pt-BR): 53,1. */
export function fmtOver(n: number): string {
  return (Math.round((n || 0) * 10) / 10).toFixed(1).replace('.', ',')
}

/** Delta com sinal: +1,2 / -0,4 / 0,0. */
export function fmtDelta(n: number): string {
  const r = Math.round((n || 0) * 10) / 10
  return (r > 0 ? '+' : '') + r.toFixed(1).replace('.', ',')
}
