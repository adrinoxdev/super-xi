import { computed } from 'vue'
import { useClubStore } from '@/stores/club'
import { useSquadStore } from '@/stores/squad'
import { useLeagueStore } from '@/stores/league'
import { useUiStore } from '@/stores/ui'
import type { ClubUpgrades, CrestOrientation, CrestPattern, CrestShape, StaffKey } from '@/types/club'
import { FACILITY_MAX_LEVEL, SQUAD_MAX_SIZE } from '@/utils/constants'
import { formatCurrency } from '@/utils/formatCurrency'
import { usePersistence } from './usePersistence'

export interface ManagerLeaderboardEntry {
  name: string
  club: string
  rep: number
  isUser: boolean
}

const RIVAL_MANAGERS: ManagerLeaderboardEntry[] = [
  { name: 'Teodoro Albuquerque', club: 'Atlético Serra Azul', rep: 1420, isUser: false },
  { name: 'Wilson Carvalhaes', club: 'Esporte Clube Ipê-Roxo', rep: 1180, isUser: false },
  { name: 'Maurício Tavares', club: 'Sociedade Esportiva Vale do Ipê', rep: 940, isUser: false },
  { name: 'Otávio Brandão', club: 'Associação Recanto do Sul', rep: 780, isUser: false }
]

/** Motivo de um gasto recusado por falta de saldo (caixa negativo ou saldo curto). */
/** Mensagem única de elenco cheio (n atletas, cap = capacidade atual). */
export function squadFullMsg(n: number, cap: number): string {
  return `Elenco cheio (${n}/${cap}): venda ou rescinda um atleta para contratar.` + (cap < SQUAD_MAX_SIZE ? ' Amplie o Alojamento & Elenco.' : '')
}

export const SQUAD_OVER_MSG = 'Elenco acima do limite: venda atletas para voltar a contratar.'

export function squadFullTitle(n: number, cap: number): string {
  return n > SQUAD_MAX_SIZE ? SQUAD_OVER_MSG : squadFullMsg(n, cap)
}

export function blockedMsg(cost: number): string {
  const club = useClubStore()
  return club.budget < 0
    ? 'Caixa negativo: gastos bloqueados até quitar a dívida.'
    : 'Saldo insuficiente (faltam ' + formatCurrency(cost - club.budget) + ').'
}

/** Aviso de folha: devolve texto se a receita fixa por jogo não cobrir folha + salário novo + manutenção; senão null. */
export function wageWarning(wage: number): string | null {
  const club = useClubStore()
  const squad = useSquadStore()
  const bill = squad.totalWageBill
  const net = 0.7 * club.projectedStadiumIncome + club.projectedSponsorIncome - (bill + wage) - club.maintenanceCost
  if (net >= 0) return null
  return (
    `Salário de ${formatCurrency(wage)}/jogo: a folha vai de ${formatCurrency(bill)} para ${formatCurrency(bill + wage)}. ` +
    `Se o caixa ficar negativo, os gastos são bloqueados e, abaixo de -${formatCurrency(club.serieEconomy.debtLimit)}, a diretoria vende atletas.`
  )
}

export function useClub() {
  const club = useClubStore()
  const league = useLeagueStore()
  const ui = useUiStore()
  const squad = useSquadStore()
  const squadPlayer = (id: string) => squad.players.find((p) => p.id === id)
  const { saveGame } = usePersistence()

  function saveIdentity(): void {
    saveGame()
  }

  function setShortName(v: string): void {
    club.shortName = (v || '').toUpperCase().slice(0, 3)
  }

  function setCrestShape(id: CrestShape): void {
    club.crestShape = id
    saveGame()
  }

  function setPrimaryColor(c: string): void {
    club.primaryColor = c
    saveGame()
  }

  function setCrestTextColor(c: string): void {
    club.crestTextColor = c === 'auto' ? 'auto' : /^#[0-9a-fA-F]{6}$/.test(c) ? c : 'auto'
    saveGame()
  }

  function setCrestTextStroke(c: string): void {
    club.crestTextStroke = /^#[0-9a-fA-F]{6}$/.test(c) ? c : 'auto'
    saveGame()
  }

  function setSecondaryColor(c: string): void {
    club.secondaryColor = c
    saveGame()
  }

  function setCrestPattern(p: CrestPattern): void {
    club.crestPattern = p
    saveGame()
  }

  function setCrestOrientation(o: CrestOrientation): void {
    club.crestOrientation = o
    saveGame()
  }

  function setCrestStripes(n: number): void {
    club.crestStripes = n
    saveGame()
  }

  function upgradeFacility(key: keyof ClubUpgrades): void {
    const cost = club.getUpgradeCost(key)
    if (club.upgrades[key] < FACILITY_MAX_LEVEL[key] && club.budget < cost) {
      ui.showToast(blockedMsg(cost), 'warning')
      return
    }
    if (!club.upgradeFacility(key)) return
    saveGame()
    ui.showToast('Ampliação concluída com sucesso!', 'success')
  }

  function hireStaffMember(item: { key: StaffKey; title: string; cost: number }): void {
    if (club.budget < item.cost) {
      ui.showToast(blockedMsg(item.cost), 'warning')
      return
    }
    if (!club.hireStaff(item.key, item.cost)) return
    saveGame()
    ui.showToast(`${item.title} contratado para a comissão técnica!`, 'success')
  }

  const topScorersList = computed(() => {
    return Object.entries(club.seasonGoals)
      .map(([id, goals]) => {
        const pl = squadPlayer(id)
        const hist = club.careerStats[id]
        return {
          id,
          name: pl ? pl.name : hist?.name || 'Atleta',
          position: pl ? pl.position : hist?.position || 'ST',
          goals
        }
      })
      .filter((x) => x.goals > 0)
      .sort((a, b) => b.goals - a.goals)
  })

  const hallOfFameList = computed(() => {
    return Object.entries(club.careerStats)
      .map(([id, st]) => ({
        id,
        name: st.name,
        position: st.position,
        apps: st.apps || 0,
        goals: st.goals || 0
      }))
      .filter((x) => x.apps > 0 || x.goals > 0)
      .sort((a, b) => b.goals - a.goals || b.apps - a.apps)
  })

  const managerLeaderboard = computed<ManagerLeaderboardEntry[]>(() => {
    const userPts = club.reputation * 25 + club.trophyGallery.length * 180
    const list: ManagerLeaderboardEntry[] = [
      { name: 'Você (' + club.name + ')', club: 'Série ' + league.serieMeta.code, rep: userPts, isUser: true },
      ...RIVAL_MANAGERS
    ]
    return list.sort((a, b) => b.rep - a.rep)
  })

  return {
    saveIdentity,
    setShortName,
    setCrestShape,
    setPrimaryColor,
    setSecondaryColor,
    setCrestTextColor,
    setCrestTextStroke,
    setCrestPattern,
    setCrestOrientation,
    setCrestStripes,
    upgradeFacility,
    hireStaffMember,
    topScorersList,
    hallOfFameList,
    managerLeaderboard
  }
}
