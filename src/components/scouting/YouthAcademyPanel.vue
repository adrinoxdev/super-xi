<script setup lang="ts">
import { useClubStore } from '@/stores/club'
import { useScoutingStore } from '@/stores/scouting'
import { useScouting } from '@/composables/useScouting'
import { blockedMsg, squadFullTitle } from '@/composables/useClub'
import { useSquadStore } from '@/stores/squad'
import { MAX_TRYOUTS_PER_SEASON } from '@/config'
import { formatCurrency, formatPosBR } from '@/utils/formatCurrency'

const club = useClubStore()
const squad = useSquadStore()
const scouting = useScoutingStore()
const { runYouthAcademyTryout, promoteYouthProspect } = useScouting()
</script>

<template>
  <div class="bg-surface rounded-2xl p-4 sm:p-5 border border-borderline shadow-sm space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div class="min-w-0">
        <span class="text-[11px] font-bold uppercase tracking-wider text-emeraldpro">Categorias de Base • Sub-17 / Sub-20</span>
        <h3 class="font-bold text-sm sm:text-base text-ink">Academia de Base Própria ({{ scouting.youthAcademyProspects.length }} Promessas)</h3>
        <p class="text-xs text-ink-muted">Peneiras desta temporada: {{ club.tryoutsThisSeason }}/{{ MAX_TRYOUTS_PER_SEASON }}</p>
        <p class="text-xs text-ink-muted break-words">Promoção gratuita: o atleta só pode ser vendido a partir da próxima temporada</p>
      </div>
      <button
        type="button"
        @click="runYouthAcademyTryout"
        :disabled="club.budget < 12000 || club.tryoutsThisSeason >= MAX_TRYOUTS_PER_SEASON"
        :title="club.tryoutsThisSeason >= MAX_TRYOUTS_PER_SEASON ? 'Limite de peneiras desta temporada atingido.' : club.budget < 12000 ? blockedMsg(12000) : undefined"
        class="px-3.5 py-2 rounded-xl bg-emeraldpro-soft hover:bg-emeraldpro hover:text-white disabled:opacity-50 text-emeraldpro text-xs font-bold transition-colors self-start sm:self-auto"
      >
        + Peneira na Base ({{ formatCurrency(12000) }})
      </button>
    </div>

    <div v-if="scouting.youthAcademyProspects.length === 0" class="p-6 rounded-xl bg-subtle border border-dashed border-borderline text-center text-xs text-ink-muted">
      Nenhuma promessa aguardando promoção no momento. As promessas se renovam na virada de temporada.
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="kid in scouting.youthAcademyProspects"
        :key="kid.id"
        class="p-3.5 rounded-xl bg-subtle border border-borderline flex items-center justify-between gap-3"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-surface border border-borderline flex flex-col items-center justify-center shrink-0">
            <span class="font-score font-extrabold text-sm text-emeraldpro leading-none">{{ kid.overall }}</span>
            <span class="text-[9px] font-bold text-ink-muted">{{ formatPosBR(kid.position) }}</span>
          </div>
          <div class="min-w-0">
            <div class="font-bold text-xs text-ink truncate" :title="kid.name">{{ kid.name }}</div>
            <div class="text-[11px] text-ink-muted truncate">
              {{ kid.age }}a • Potencial <strong class="text-ink">{{ kid.potential }}</strong>
            </div>
          </div>
        </div>
        <button
          type="button"
          @click="promoteYouthProspect(kid)"
          :disabled="squad.isFull"
          :title="squad.isFull ? squadFullTitle(squad.players.length, club.maxSquadCapacity) : undefined"
          class="px-3 py-1.5 rounded-lg bg-emeraldpro hover:bg-emeraldpro-hover disabled:bg-borderline disabled:text-ink-muted disabled:cursor-not-allowed text-white text-[11px] font-bold shrink-0"
        >
          Promover
        </button>
      </div>
    </div>
  </div>
</template>
