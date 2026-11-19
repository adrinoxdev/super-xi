import type { FriendlyBot } from '@/types/friendlies'

/** Posição do usuário: 1 + bots com fama maior (empate favorece o usuário). Vai de 1 a bots.length + 1. */
export function userRank(fame: number, bots: readonly FriendlyBot[]): number {
  return 1 + bots.filter((b) => b.fame > fame).length
}

/** Bots em ordem de fama (desc., estável) com a posição no ranking que inclui o usuário. */
export function rankedBots(bots: readonly FriendlyBot[], userFame: number): Array<{ bot: FriendlyBot; rank: number }> {
  const uRank = userRank(userFame, bots)
  return [...bots]
    .sort((a, b) => b.fame - a.fame)
    .map((bot, i) => ({ bot, rank: i + 1 >= uRank ? i + 2 : i + 1 }))
}
