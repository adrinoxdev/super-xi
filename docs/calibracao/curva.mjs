// Curva de vitórias por diferença de OVER (cálculo exato: binomial por tick, 45 ticks).
// Uso: node curva.mjs [S] [H] [PMIN] [PMAX]
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const TICKS = 45
function binom(n, p) {
  const out = new Array(n + 1).fill(0)
  out[0] = 1
  for (let t = 0; t < n; t++) for (let k = t + 1; k >= 0; k--) out[k] = out[k] * (1 - p) + (k ? out[k - 1] * p : 0)
  return out
}
function wdl(gu, go) {
  const A = binom(TICKS, gu), B = binom(TICKS, go)
  let w = 0, d = 0
  for (let i = 0; i <= TICKS; i++) for (let j = 0; j <= TICKS; j++) { const pr = A[i] * B[j]; if (i > j) w += pr; else if (i === j) d += pr }
  return { w, d, l: 1 - w - d, gu: TICKS * gu, go: TICKS * go }
}
export const P = {
  S: Number(process.argv[2] ?? 0.0075), H: Number(process.argv[3] ?? 2), PMIN: Number(process.argv[4] ?? 0.035), PMAX: Number(process.argv[5] ?? 0.24),
  BU: 0.11, BO: 0.10, CU: 0.56 * 0.44, CO: 0.52 * 0.40, BA: 0.105, CA: 0.54 * 0.42, FORM: 1.5
}
// jogo do usuário: d já inclui mando; mentalidade multiplica as chances (atk) e divide as do rival (def)
export function userWDL(d, atkMod = 1, defMod = 1, p = P) {
  const pu = clamp(clamp(p.BU + p.S * d, p.PMIN, p.PMAX) * atkMod, 0.02, 0.3)
  const po = clamp(clamp(p.BO - p.S * d, p.PMIN, p.PMAX) / defMod, 0.02, 0.3)
  return wdl(pu * p.CU, po * p.CO)
}
// média casa/fora (metade dos jogos em cada)
export function userAvg(diff, atk = 1, def = 1, p = P) {
  const h = userWDL(diff + p.H, atk, def, p), a = userWDL(diff - p.H, atk, def, p)
  return { w: (h.w + a.w) / 2, d: (h.d + a.d) / 2, l: (h.l + a.l) / 2, gu: (h.gu + a.gu) / 2, go: (h.go + a.go) / 2, wh: h.w, wa: a.w }
}
export function aiWDL(diff, p = P) { // mandante com diff de OVER (sem mando), forma ±FORM uniforme
  let w = 0, d = 0, n = 0
  for (let k = -10; k <= 10; k++) for (let m = -10; m <= 10; m++) {
    const dd = diff + p.H + (k / 10) * p.FORM - (m / 10) * p.FORM
    const r = wdl(clamp(p.BA + p.S * dd, p.PMIN, p.PMAX) * p.CA, clamp(p.BA - p.S * dd, p.PMIN, p.PMAX) * p.CA)
    w += r.w; d += r.d; n++
  }
  return { w: w / n, d: d / n, l: 1 - (w + d) / n }
}
if (process.argv[1] && process.argv[1].endsWith('curva.mjs')) {
  const pc = v => (100 * v).toFixed(0).padStart(3)
  console.log('params', JSON.stringify(P))
  console.log(' dif | usuário V  E  D (casa/fora) gols | IA mandante V E D')
  for (const d of [-30, -20, -15, -10, -5, 0, 5, 10, 15, 20, 30]) {
    const u = userAvg(d), a = aiWDL(d)
    console.log(`${String(d).padStart(4)} | ${pc(u.w)} ${pc(u.d)} ${pc(u.l)}  (${pc(u.wh)}/${pc(u.wa)})  ${u.gu.toFixed(2)}x${u.go.toFixed(2)} | ${pc(a.w)} ${pc(a.d)} ${pc(a.l)}`)
  }
}
