/** Minuto para exibição: acréscimos aparecem como 90+3'. */
export function formatMinute(minute: number): string {
  return minute > 90 ? `90+${minute - 90}'` : `${minute}'`
}
