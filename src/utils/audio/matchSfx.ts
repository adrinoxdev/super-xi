import type { MatchEventType } from '@/types/match'
import { playCheer, playGroan, playOoh, playOuch, playWhistle } from './sfx'

/** Som de um lance narrado. Apitos de início, intervalo e fim são tocados à parte (têm placar e fase). */
export function playMatchEventSfx(type: MatchEventType) {
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
    case 'post':
      playOoh()
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
