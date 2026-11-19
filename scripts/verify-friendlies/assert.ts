/** Checagens simples para as funções puras dos amistosos (sem test runner, ver spec §9). */
export function createChecker() {
  const fails: string[] = []
  return {
    fails,
    eq(name: string, got: unknown, expected: unknown) {
      const g = JSON.stringify(got)
      const e = JSON.stringify(expected)
      if (g !== e) fails.push(`${name}: esperado ${e}, veio ${g}`)
    },
    ok(name: string, cond: boolean, detail = '') {
      if (!cond) fails.push(detail ? `${name}: ${detail}` : name)
    }
  }
}
