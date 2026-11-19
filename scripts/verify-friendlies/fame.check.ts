import { createChecker } from './assert'
import { applyFame, expectedScore, fameDelta, outcomeFromScore, signedFame } from '@/utils/friendlies/fame'

// Tabela da spec §6: diferença oppOver − userOver → vitória / empate / derrota.
const TABLE: Array<[number, number, number, number]> = [
  [0, 15, 0, -15],
  [5, 19, 4, -11],
  [-5, 11, -4, -19],
  [10, 23, 6, -7],
  [20, 27, 6, -3]
]

export function run(): string[] {
  const c = createChecker()
  c.eq('E com OVERs iguais', expectedScore(60, 60), 0.5)
  for (const [diff, w, d, l] of TABLE) {
    c.eq(`vitoria diff ${diff}`, fameDelta(60, 60 + diff, 'win'), w)
    c.eq(`empate diff ${diff}`, fameDelta(60, 60 + diff, 'draw'), d)
    c.eq(`derrota diff ${diff}`, fameDelta(60, 60 + diff, 'loss'), l)
  }
  c.eq('vitoria minima 4', fameDelta(90, 40, 'win'), 4)
  c.eq('derrota minima 3', fameDelta(40, 90, 'loss'), -3)
  c.eq('fama nao fica negativa', applyFame(10, -15), 0)
  c.eq('derrota com fama 0', applyFame(0, -3), 0)
  c.eq('soma normal', applyFame(5, 4), 9)
  c.eq('resultado vitoria', outcomeFromScore(2, 1), 'win')
  c.eq('resultado empate', outcomeFromScore(1, 1), 'draw')
  c.eq('resultado derrota', outcomeFromScore(0, 3), 'loss')
  c.eq('sinal positivo', signedFame(19), '+19')
  c.eq('sinal zero', signedFame(0), '0')
  c.eq('sinal negativo', signedFame(-11), '−11')
  return c.fails
}
