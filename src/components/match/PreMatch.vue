<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { Play, Shield } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import MentalitySelector from '@/components/ui/MentalitySelector.vue'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import MatchBackButton from '@/components/match/MatchBackButton.vue'
import OutcomeBar from '@/components/match/OutcomeBar.vue'
import { pickMatchColors } from '@/utils/identity/matchColors'
import { getTeamIdentity } from '@/utils/identity/teamIdentities'
import { useClubStore } from '@/stores/club'
import { useMatchStore } from '@/stores/match'
import { homeBonusApplies, useMatchSimulation } from '@/composables/useMatchSimulation'
import { formatCurrency } from '@/utils/format/formatCurrency'
import { estimateOutcome } from '@/utils/match/winChance'
import { ECONOMY, FRIENDLIES, MATCH_SIM } from '@/config'
import { useSquadStore } from '@/stores/squad'
import { useFriendliesStore } from '@/stores/friendlies'
import { COMP_SHORT } from '@/utils/player/suspension'
import { formatTokenCountdown } from '@/utils/friendlies/tokens'
import { signedFame } from '@/utils/friendlies/fame'
import BaseCard from '@/components/ui/BaseCard.vue'
import ListRow from '@/components/ui/ListRow.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()
const club = useClubStore()
const match = useMatchStore()
const { selectedMentality, mentalityInfo } = storeToRefs(match)
const {
  activeMatchIsHome,
  activeMatchOpponent,
  activeMatchCompetitionLabel,
  effectiveUserPower,
  effectiveOpponentPower,
  lineupBlockers,
  lineupShort,
  friendlyLiveBlock,
  startLiveMatch
} = useMatchSimulation()

const squad = useSquadStore()
const friendlies = useFriendliesStore()
const isFriendly = computed(() => match.activeMatchCompetition === 'friendly')
// Titulares suspensos na competição que ainda dá para trocar: a partida só começa depois de escalar outro.
// No amistoso: lesionados ou suspensos em qualquer competição, sempre.
const blockers = computed(() => lineupBlockers(match.activeMatchCompetition))
const short = computed(() => lineupShort(match.activeMatchCompetition))
const noToken = computed(() => isFriendly.value && friendlies.tokens < 1)
// Amistoso não começa com partida de outra competição ao vivo (spec §2.11): motivo vem de friendlyLiveBlock.
const liveBlock = computed(() => (isFriendly.value ? friendlyLiveBlock() : null))
// Escalação atual abaixo da melhor elegível: o rival é calculado pela mais forte (spec §6), então vale avisar.
const belowBest = computed(() => isFriendly.value && squad.friendlyStrength.best > squad.friendlyStrength.current + 0.5)
const startDisabled = computed(() => !!liveBlock.value || blockers.value.length > 0 || short.value || noToken.value)
const startTitle = computed(() => {
  if (liveBlock.value) return liveBlock.value
  if (blockers.value.length) return isFriendly.value ? 'Escalação irregular: troque o lesionado ou suspenso em Ajustar Tática.' : 'Escalação irregular: substitua o suspenso em Ajustar Tática.'
  if (short.value) return 'São precisos 11 titulares.'
  if (noToken.value) return `Sem fichas — próxima em ${formatTokenCountdown(friendlies.msToNext)}`
  return undefined
})
const friendlyOption = computed(() => friendlies.selectedOption)
// Cotação viva (spec §2.3): OVER do rival, prêmio e fama com o OVER efetivo (o mesmo do apito); só ficam fixos no apito.
const friendlyQuote = computed(() =>
  friendlyOption.value ? friendlies.quote(friendlyOption.value, squad.friendlyStrength.over, club.clubNow) : null
)
const homeBonus = computed(() => homeBonusApplies(match.activeMatchCompetition))
// Amistoso: chance com a força real em campo e energia 100 (o motor joga com quem está escalado; o rival vem do OVER efetivo).
const estimate = computed(() =>
  estimateOutcome(isFriendly.value ? squad.freshTeamStrength.rating : squad.teamStrength.rating, activeMatchOpponent.value.power, {
    isHome: activeMatchIsHome.value,
    atkMod: mentalityInfo.value.atkMod,
    defMod: mentalityInfo.value.defMod,
    homeBonusApplies: homeBonus.value
  })
)
const matchColors = computed(() =>
  pickMatchColors({ primaryColor: club.primaryColor }, getTeamIdentity(activeMatchOpponent.value.name))
)
const pctOf = (v: number) => Math.round(v * 100)
const winPct = computed(() => pctOf(estimate.value.win))
const lossPct = computed(() => pctOf(estimate.value.loss))
const drawPct = computed(() => Math.max(0, 100 - winPct.value - lossPct.value))
</script>

<template>
  <BaseCard padding="p-5 sm:p-6" class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-borderline pb-4">
      <div class="min-w-0">
        <span class="inline-block max-w-full px-2.5 py-0.5 rounded-full bg-emeraldpro-soft text-emeraldpro text-xs font-bold uppercase break-words">
          {{ activeMatchCompetitionLabel }}
        </span>
        <h2 class="text-xl sm:text-2xl font-extrabold text-ink mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <template v-if="activeMatchIsHome">
            <span class="min-w-0 break-words [overflow-wrap:anywhere]">{{ club.name }}</span>
            <span class="inline-flex items-center gap-2"><TeamCrest size="sm" is-user />vs<TeamCrest size="sm" :name="activeMatchOpponent.name" /></span>
            <span class="min-w-0 break-words [overflow-wrap:anywhere]">{{ activeMatchOpponent.name }}</span>
          </template>
          <template v-else>
            <span class="min-w-0 break-words [overflow-wrap:anywhere]">{{ activeMatchOpponent.name }}</span>
            <span class="inline-flex items-center gap-2"><TeamCrest size="sm" :name="activeMatchOpponent.name" />vs<TeamCrest size="sm" is-user /></span>
            <span class="min-w-0 break-words [overflow-wrap:anywhere]">{{ club.name }}</span>
          </template>
        </h2>
        <p class="text-xs text-ink-muted mt-0.5 break-words [overflow-wrap:anywhere]">
          {{ activeMatchIsHome ? 'Mandante no estádio ' + club.stadiumName : 'Jogo como Visitante' }} • Estilo Rival: <strong class="text-ink">{{ activeMatchOpponent.style }}</strong>
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-auto">
        <MatchBackButton class="px-4 py-3 min-h-11 rounded-xl border border-borderline hover:bg-subtle text-ink-muted hover:text-ink text-sm font-bold transition-colors flex items-center justify-center gap-2" />
        <button
          type="button"
          @click="router.push('/squad')"
          class="px-4 py-3 min-h-11 rounded-xl bg-subtle hover:bg-borderline text-ink text-sm font-bold transition-colors flex items-center justify-center gap-2"
        >
          <Shield class="w-4 h-4 text-emeraldpro" />
          Ajustar Tática
        </button>
        <BaseButton
          @click="startLiveMatch"
          :disabled="startDisabled"
          :title="startTitle"
          class="px-6 py-3 text-sm shadow-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed"
        >
          <Play class="w-4 h-4 fill-current" />
          Iniciar Partida
        </BaseButton>
      </div>
    </div>

    <p v-if="isFriendly" class="text-xs text-ink-muted break-words">
      Custa 1 ficha (<strong class="text-ink">{{ friendlies.tokens }}/{{ FRIENDLIES.tokens.max }}</strong>).
      <template v-if="noToken"> Sem fichas — próxima em <strong class="text-ink">{{ formatTokenCountdown(friendlies.msToNext) }}</strong>.</template>
    </p>

    <div v-if="blockers.length" class="p-3 rounded-xl bg-dangerpro-soft border border-dangerpro/40 text-xs text-ink break-words" role="alert">
      <strong class="text-dangerpro">Escalação irregular:</strong>
      <template v-if="isFriendly">
        {{ blockers.map((p) => p.name).join(', ') }} {{ blockers.length === 1 ? 'está lesionado ou suspenso' : 'estão lesionados ou suspensos' }}.
      </template>
      <template v-else>
        {{ blockers.map((p) => p.name).join(', ') }} {{ blockers.length === 1 ? 'está suspenso' : 'estão suspensos' }} na {{ COMP_SHORT[match.activeMatchCompetition] }}.
      </template>
      Troque em <strong>Ajustar Tática</strong> antes de iniciar a partida.
    </div>

    <div v-if="short" class="p-3 rounded-xl bg-dangerpro-soft border border-dangerpro/40 text-xs text-ink break-words" role="alert">
      <strong class="text-dangerpro">Escalação incompleta:</strong> são precisos 11 titulares para o amistoso.
    </div>

    <div v-if="liveBlock" class="p-3 rounded-xl bg-dangerpro-soft border border-dangerpro/40 text-xs text-ink break-words" role="alert">
      <strong class="text-dangerpro">Outra partida ao vivo:</strong> {{ liveBlock }}
    </div>

    <p v-if="belowBest" class="p-3 rounded-xl border border-amberpro/40 bg-amberpro-soft text-xs text-amberpro font-semibold break-words">
      Sua escalação (OVER {{ Math.round(squad.friendlyStrength.current) }}) está abaixo da melhor possível
      (OVER {{ Math.round(squad.friendlyStrength.best) }}). O rival, o prêmio e a fama são calculados pela mais forte.
    </p>

    <div class="space-y-2">
      <label class="text-xs font-bold uppercase tracking-wider text-ink-muted block">Postura Tática Inicial</label>
      <MentalitySelector v-model="selectedMentality" variant="cards" />
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <ListRow padding="p-3.5" layout="block" class="min-w-0 break-words">
        <span class="text-[11px] font-bold uppercase text-ink-muted block">Mando de Campo</span>
        <strong class="font-score text-lg text-emeraldpro block mt-0.5">
          {{ !homeBonus ? 'Sem bônus de mando' : activeMatchIsHome ? '+' + MATCH_SIM.homeAdvantage + ' OVER (Mandante)' : 'Visitante (+0)' }}
        </strong>
        <span class="text-[11px] text-ink-muted">
          OVER Efetivo: {{ effectiveUserPower }} vs {{ effectiveOpponentPower }}
        </span>
      </ListRow>

      <ListRow padding="p-3.5" layout="block" class="min-w-0 break-words">
        <span class="text-[11px] font-bold uppercase text-ink-muted block">Bônus Tático</span>
        <strong class="font-score text-lg text-ink block mt-0.5">{{ mentalityInfo.label }}</strong>
        <span class="text-[11px] text-ink-muted">
          ATQ x{{ mentalityInfo.atkMod.toFixed(2) }} • DEF x{{ mentalityInfo.defMod.toFixed(2) }}
        </span>
      </ListRow>

      <template v-if="isFriendly">
        <ListRow padding="p-3.5" layout="block" class="min-w-0 break-words">
          <span class="text-[11px] font-bold uppercase text-ink-muted block">Prêmio da Vitória</span>
          <strong class="font-score text-lg text-emeraldpro block mt-0.5">+{{ formatCurrency(friendlyQuote?.prize ?? 0) }}</strong>
          <span class="text-[11px] text-ink-muted">{{ friendlyQuote && friendlyQuote.prize === 0 ? 'Limite diário de vitórias pagas atingido' : 'Só na vitória • estimativa, fixado no apito inicial' }}</span>
        </ListRow>
        <ListRow padding="p-3.5" layout="block" class="min-w-0 break-words">
          <span class="text-[11px] font-bold uppercase text-ink-muted block">Fama em Jogo</span>
          <strong class="font-score text-lg text-ink block mt-0.5">
            {{ friendlyQuote ? `${signedFame(friendlyQuote.fameWin)} / ${signedFame(friendlyQuote.fameDraw)} / ${signedFame(friendlyQuote.fameLoss)}` : '—' }}
          </strong>
          <span class="text-[11px] text-ink-muted">Vitória / Empate / Derrota • estimativa, fixada no apito inicial</span>
        </ListRow>
      </template>
      <ListRow v-if="!isFriendly" padding="p-3.5" layout="block" class="min-w-0 break-words">
        <span class="text-[11px] font-bold uppercase text-ink-muted block">Bilheteria Estimada</span>
        <strong class="font-score text-lg text-emeraldpro block mt-0.5">
          +{{ formatCurrency(activeMatchIsHome ? club.projectedStadiumIncome : Math.round(club.projectedStadiumIncome * ECONOMY.awayTicketShare)) }}
        </strong>
        <span class="text-[11px] text-ink-muted">Estádio Nível {{ club.upgrades.stadiumLevel }}</span>
      </ListRow>

      <ListRow v-if="!isFriendly" padding="p-3.5" layout="block" class="min-w-0 break-words">
        <span class="text-[11px] font-bold uppercase text-ink-muted block">Cota Patrocínio</span>
        <strong class="font-score text-lg text-emeraldpro block mt-0.5">
          +{{ formatCurrency(club.projectedSponsorIncome) }}
        </strong>
        <span class="text-[11px] text-ink-muted">Finanças Nível {{ club.upgrades.financeLevel }}</span>
      </ListRow>
    </div>
    <ListRow padding="p-3.5" layout="block" class="min-w-0 space-y-2.5 break-words">
      <span class="text-[11px] font-bold uppercase text-ink-muted block">Chance estimada*</span>
      <OutcomeBar
        :win="winPct"
        :draw="drawPct"
        :loss="lossPct"
        :user-color="matchColors.user"
        :opp-color="matchColors.opp"
        :user-name="club.name"
        :opp-name="activeMatchOpponent.name"
      />
      <p class="text-[11px] leading-snug text-ink-muted break-words [overflow-wrap:anywhere]">
        *Estimativa pela diferença de OVER, mentalidade e mando. Zebras podem acontecer.
      </p>
    </ListRow>
  </BaseCard>
</template>
