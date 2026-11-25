import type { MatchEventType } from '@/types/match'
import { playCheer, playGroan, playOoh, playOuch, playPostHit, playWhistle } from './sfx'

export type EventSide = 'user' | 'opp'

// Lances que o ouvinte precisa distinguir vencem os discretos quando caem juntos (mesmo tick).
const PRIORITY: Partial<Record<MatchEventType, number>> = {
  goal: 3, opp_goal: 3, penalty: 2, red: 2, injury: 2, brawl: 2, freekick: 2, yellow: 1, offside: 1, post: 1
}
const WINDOW_MS = 1200
let lastAt = 0
let lastPriority = 0

/**
 * Som de um lance narrado. Apitos de início, intervalo e fim são tocados à parte (têm placar e fase).
 * `side` é de quem é o lance: a trave do rival não arranca o "ohhh" da sua torcida.
 */
export function playMatchEventSfx(type: MatchEventType, side?: EventSide) {
  const prio = PRIORITY[type] ?? 0
  const now = Date.now()
  // Fila: um lance de prioridade igual ou menor logo após outro não toca por cima (vira ruído).
  const busy = now - lastAt < WINDOW_MS && prio <= lastPriority
  if (type === 'post') {
    // O toque da bola no poste é físico e sempre soa; só o "ohhh" da torcida respeita a fila e o lado.
    playPostHit()
    if (!busy) {
      if (side !== 'opp') setTimeout(playOoh, 180)
      lastAt = now
      lastPriority = prio
    }
    return
  }
  if (busy) return
  lastAt = now
  lastPriority = prio
  switch (type) {
    case 'goal':
      playCheer()
      break
    case 'opp_goal':
      playGroan()
      break
    case 'offside':
      playWhistle('offside')
      break
    case 'freekick':
      playWhistle('foul')
      setTimeout(playOuch, 350)
      break
    case 'yellow':
      playWhistle('foul')
      break
    case 'red':
      playWhistle('foul')
      setTimeout(() => playGroan(false), 450)
      break
    case 'penalty':
      playWhistle('penalty')
      break
    case 'injury':
      playWhistle('stop')
      setTimeout(playOuch, 500)
      break
    case 'brawl':
      playWhistle('stop')
      setTimeout(() => playGroan(false), 450)
      break
    default:
      break
  }
}

/** Apito final: vitória levanta a torcida, derrota arranca o "Aaah!", empate só apita. */
export function playFullTimeSfx(userScore: number, oppScore: number) {
  playWhistle('full')
  if (userScore > oppScore) setTimeout(() => playCheer(true), 1700)
  else if (userScore < oppScore) setTimeout(() => playGroan(true), 1700)
}
