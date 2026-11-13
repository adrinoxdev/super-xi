/** Meia-noite (horário local) do dia de um instante, em ms. */
export function dayStart(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Início do dia seguinte (sem somar 24h fixas: respeita horário de verão). */
export function nextDayStart(ts: number): number {
  const d = new Date(dayStart(ts))
  d.setDate(d.getDate() + 1)
  return d.getTime()
}
