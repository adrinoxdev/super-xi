<script setup lang="ts">
import { computed } from 'vue'
import TeamCrest from '@/components/ui/TeamCrest.vue'
import { getTeamIdentity } from '@/utils/identity/teamIdentities'
import { pickMatchColors } from '@/utils/identity/matchColors'
import { useClubStore } from '@/stores/club'
import { useMatchStore } from '@/stores/match'
import { homeBonusApplies, useMatchSimulation } from '@/composables/useMatchSimulation'
import { getStatBarPct } from '@/utils/format/formatCurrency'
import { MATCH_SIM } from '@/config'
import BaseCard from '@/components/ui/BaseCard.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'
import Badge from '@/components/ui/Badge.vue'

const match = useMatchStore()
const club = useClubStore()
const homeBonus = computed(() => homeBonusApplies(match.activeMatchCompetition))
const { activeMatchIsHome, activeMatchOpponent } = useMatchSimulation()

// Cor primária da identidade de cada time; o adversário cai para a secundária/ink se faltar contraste.
const matchColors = computed(() =>
  pickMatchColors({ primaryColor: club.primaryColor }, getTeamIdentity(activeMatchOpponent.value.name))
)
const userColor = computed(() => matchColors.value.user)
const OPP_COLOR = computed(() => matchColors.value.opp)

// matchStats guarda user/opp (nao home/away): converte para esquerda/direita conforme o mando.
const userLeft = computed(() => activeMatchIsHome.value)
const leftColor = computed(() => (userLeft.value ? userColor.value : OPP_COLOR.value))
const rightColor = computed(() => (userLeft.value ? OPP_COLOR.value : userColor.value))
const leftName = computed(() => (userLeft.value ? club.name : activeMatchOpponent.value.name))
const rightName = computed(() => (userLeft.value ? activeMatchOpponent.value.name : club.name))

const rows = computed(() => {
  const s = match.matchStats
  const raw = [
    { label: 'Posse de Bola', user: s.userPossession + '%', opp: 100 - s.userPossession + '%', pct: s.userPossession },
    { label: 'Finalizações', user: s.userShots, opp: s.oppShots, pct: getStatBarPct(s.userShots, s.oppShots) },
    { label: 'Chutes no Gol', user: s.userShotsOnTarget, opp: s.oppShotsOnTarget, pct: getStatBarPct(s.userShotsOnTarget, s.oppShotsOnTarget) },
    { label: 'Escanteios', user: s.userCorners, opp: s.oppCorners, pct: getStatBarPct(s.userCorners, s.oppCorners) },
    { label: 'Faltas', user: s.userFouls, opp: s.oppFouls, pct: getStatBarPct(s.userFouls, s.oppFouls) },
    { label: 'Cartões Amarelos', user: s.userYellows ?? 0, opp: s.oppYellows ?? 0, pct: getStatBarPct(s.userYellows ?? 0, s.oppYellows ?? 0) },
    { label: 'Cartões Vermelhos', user: s.userReds ?? 0, opp: s.oppReds ?? 0, pct: getStatBarPct(s.userReds ?? 0, s.oppReds ?? 0) },
    { label: 'Impedimentos', user: s.userOffsides ?? 0, opp: s.oppOffsides ?? 0, pct: getStatBarPct(s.userOffsides ?? 0, s.oppOffsides ?? 0) },
    { label: 'Laterais', user: s.userThrowIns ?? 0, opp: s.oppThrowIns ?? 0, pct: getStatBarPct(s.userThrowIns ?? 0, s.oppThrowIns ?? 0) }
  ]
  return raw.map(r => ({
    label: r.label,
    left: userLeft.value ? r.user : r.opp,
    right: userLeft.value ? r.opp : r.user,
    leftPct: userLeft.value ? r.pct : 100 - r.pct
  }))
})
</script>

<template>
  <BaseCard padding="p-4 sm:p-5" class="lg:col-span-5 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <SectionTitle size="responsive" class="min-w-0">Estatísticas em Tempo Real</SectionTitle>
      <Badge tone="neutral" size="sm" class="shrink-0">Ao Vivo</Badge>
    </div>

    <div class="space-y-3.5 text-xs">
      <div class="flex items-center justify-between gap-2 font-bold text-[11px] sm:text-xs">
        <div class="flex items-center gap-1.5 min-w-0">
          <TeamCrest v-if="userLeft" class="shrink-0" size="sm" is-user />
          <TeamCrest v-else class="shrink-0" size="sm" :name="activeMatchOpponent.name" />
          <span class="truncate" :title="leftName" :style="{ color: leftColor }">{{ leftName }}</span>
        </div>
        <div class="flex items-center gap-1.5 min-w-0 justify-end">
          <span class="truncate text-right" :title="rightName" :style="{ color: rightColor }">{{ rightName }}</span>
          <TeamCrest v-if="!userLeft" class="shrink-0" size="sm" is-user />
          <TeamCrest v-else class="shrink-0" size="sm" :name="activeMatchOpponent.name" />
        </div>
      </div>
      <div v-for="r in rows" :key="r.label" class="space-y-1">
        <div class="flex items-center justify-between font-bold">
          <span class="px-2 py-0.5 rounded bg-subtle" :style="{ color: leftColor }">{{ r.left }}</span>
          <span class="text-ink-muted">{{ r.label }}</span>
          <span class="px-2 py-0.5 rounded bg-subtle" :style="{ color: rightColor }">{{ r.right }}</span>
        </div>
        <div class="w-full h-2 rounded-full overflow-hidden flex" :style="{ backgroundColor: rightColor }">
          <div class="h-full transition-all duration-300" :style="{ width: r.leftPct + '%', backgroundColor: leftColor }"></div>
        </div>
      </div>
    </div>

    <div class="pt-3 border-t border-borderline text-[11px] text-ink-muted space-y-1">
      <div class="flex justify-between">
        <span>Mando de Campo:</span>
        <strong class="text-ink">{{ !homeBonus ? 'Sem bônus de mando' : activeMatchIsHome ? '+' + MATCH_SIM.homeAdvantage + ' OVER Mandante' : 'Visitante (+0)' }}</strong>
      </div>
      <div class="flex justify-between">
        <span>Postura Ativa:</span>
        <strong class="text-emeraldpro">{{ match.mentalityInfo.label }}</strong>
      </div>
    </div>
  </BaseCard>
</template>
