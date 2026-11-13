<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { Play, Shield } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import MentalitySelector from '@/components/ui/MentalitySelector.vue'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import OutcomeBar from '@/components/match/OutcomeBar.vue'
import { pickMatchColors } from '@/utils/matchColors'
import { getTeamIdentity } from '@/utils/teamIdentities'
import { useClubStore } from '@/stores/club'
import { useMatchStore } from '@/stores/match'
import { homeBonusApplies, useMatchSimulation } from '@/composables/useMatchSimulation'
import { formatCurrency } from '@/utils/formatCurrency'
import { estimateOutcome } from '@/utils/winChance'
import { ECONOMY, MATCH_SIM } from '@/config'
import { useSquadStore } from '@/stores/squad'

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
  startLiveMatch
} = useMatchSimulation()

const squad = useSquadStore()
const homeBonus = computed(() => homeBonusApplies(match.activeMatchCompetition))
const estimate = computed(() =>
  estimateOutcome(squad.teamStrength.rating, activeMatchOpponent.value.power, {
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
  <div class="bg-surface rounded-2xl p-5 sm:p-6 border border-borderline shadow-sm space-y-6">
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
        <button
          type="button"
          @click="router.push('/squad')"
          class="px-4 py-3 rounded-xl bg-subtle hover:bg-borderline text-ink text-sm font-bold transition-colors flex items-center justify-center gap-2"
        >
          <Shield class="w-4 h-4 text-emeraldpro" />
          Ajustar Tática
        </button>
        <button
          type="button"
          @click="startLiveMatch"
          class="px-6 py-3 rounded-xl bg-emeraldpro hover:bg-emeraldpro-hover text-white text-sm font-bold shadow-sm flex items-center justify-center gap-2"
        >
          <Play class="w-4 h-4 fill-current" />
          Iniciar Partida
        </button>
      </div>
    </div>

    <div class="space-y-2">
      <label class="text-xs font-bold uppercase tracking-wider text-ink-muted block">Postura Tática Inicial</label>
      <MentalitySelector v-model="selectedMentality" variant="cards" />
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="min-w-0 p-3.5 rounded-xl bg-subtle border border-borderline break-words">
        <span class="text-[10px] font-bold uppercase text-ink-muted block">Mando de Campo</span>
        <strong class="font-score text-lg text-emeraldpro block mt-0.5">
          {{ !homeBonus ? 'Sem bônus de mando' : activeMatchIsHome ? '+' + MATCH_SIM.homeAdvantage + ' OVER (Mandante)' : 'Visitante (+0)' }}
        </strong>
        <span class="text-[11px] text-ink-muted">
          OVER Efetivo: {{ effectiveUserPower }} vs {{ effectiveOpponentPower }}
        </span>
      </div>

      <div class="min-w-0 p-3.5 rounded-xl bg-subtle border border-borderline break-words">
        <span class="text-[10px] font-bold uppercase text-ink-muted block">Bônus Tático</span>
        <strong class="font-score text-lg text-ink block mt-0.5">{{ mentalityInfo.label }}</strong>
        <span class="text-[11px] text-ink-muted">
          ATQ x{{ mentalityInfo.atkMod.toFixed(2) }} • DEF x{{ mentalityInfo.defMod.toFixed(2) }}
        </span>
      </div>

      <div class="min-w-0 p-3.5 rounded-xl bg-subtle border border-borderline break-words">
        <span class="text-[10px] font-bold uppercase text-ink-muted block">Bilheteria Estimada</span>
        <strong class="font-score text-lg text-emeraldpro block mt-0.5">
          +{{ formatCurrency(activeMatchIsHome ? club.projectedStadiumIncome : Math.round(club.projectedStadiumIncome * ECONOMY.awayTicketShare)) }}
        </strong>
        <span class="text-[11px] text-ink-muted">Estádio Nível {{ club.upgrades.stadiumLevel }}</span>
      </div>

      <div class="min-w-0 p-3.5 rounded-xl bg-subtle border border-borderline break-words">
        <span class="text-[10px] font-bold uppercase text-ink-muted block">Cota Patrocínio</span>
        <strong class="font-score text-lg text-emeraldpro block mt-0.5">
          +{{ formatCurrency(club.projectedSponsorIncome) }}
        </strong>
        <span class="text-[11px] text-ink-muted">Finanças Nível {{ club.upgrades.financeLevel }}</span>
      </div>
    </div>
    <div class="min-w-0 p-3.5 rounded-xl bg-subtle border border-borderline space-y-2.5 break-words">
      <span class="text-[10px] font-bold uppercase text-ink-muted block">Chance estimada*</span>
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
    </div>
  </div>
</template>
