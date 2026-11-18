<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue'
import SectionTitle from '@/components/ui/SectionTitle.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ListRow from '@/components/ui/ListRow.vue'
import { useClubStore } from '@/stores/club'
import { useScoutingStore } from '@/stores/scouting'
import { useScouting } from '@/composables/useScouting'
import { blockedMsg, squadFullTitle } from '@/composables/useClub'
import { useSquadStore } from '@/stores/squad'
import { MAX_TRYOUTS_PER_SEASON, YOUTH } from '@/config'
import { formatCurrency, formatPosBR } from '@/utils/format/formatCurrency'

const club = useClubStore()
const squad = useSquadStore()
const scouting = useScoutingStore()
const { runYouthAcademyTryout, promoteYouthProspect } = useScouting()
</script>

<template>
  <BaseCard padding="p-4 sm:p-5" class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div class="min-w-0">
        <span class="text-[11px] font-bold uppercase tracking-wider text-emeraldpro">Categorias de Base • Sub-17 / Sub-20</span>
        <SectionTitle size="responsive">Academia de Base Própria ({{ scouting.youthAcademyProspects.length }} Promessas)</SectionTitle>
        <p class="text-xs text-ink-muted">Peneiras desta temporada: {{ club.tryoutsThisSeason }}/{{ MAX_TRYOUTS_PER_SEASON }}</p>
        <p class="text-xs text-ink-muted break-words">Promoção gratuita: o atleta só pode ser vendido ou emprestado {{ YOUTH.lockSeasons }} temporadas depois da promoção</p>
      </div>
      <BaseButton
        variant="soft"
        @click="runYouthAcademyTryout"
        :disabled="club.budget < 12000 || club.tryoutsThisSeason >= MAX_TRYOUTS_PER_SEASON"
        :title="club.tryoutsThisSeason >= MAX_TRYOUTS_PER_SEASON ? 'Limite de peneiras desta temporada atingido.' : club.budget < 12000 ? blockedMsg(12000) : undefined"
        class="min-h-[40px] sm:min-h-0 px-3.5 py-2 disabled:opacity-50 text-xs transition-colors w-full sm:w-auto"
      >
        + Peneira na Base ({{ formatCurrency(12000) }})
      </BaseButton>
    </div>

    <EmptyState v-if="scouting.youthAcademyProspects.length === 0">
      Nenhuma promessa aguardando promoção no momento. As promessas se renovam na virada de temporada.
    </EmptyState>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <ListRow
        v-for="kid in scouting.youthAcademyProspects"
        :key="kid.id"
        padding="p-3.5"
        layout="block"
        class="flex flex-wrap items-center justify-between gap-3"
      >
        <div class="flex items-center gap-2.5 min-w-0 flex-1">
          <div class="w-10 h-10 rounded-xl bg-surface border border-borderline flex flex-col items-center justify-center shrink-0">
            <span class="font-score font-extrabold text-sm text-emeraldpro leading-none">{{ kid.overall }}</span>
            <span class="text-[11px] md:text-[10px] font-bold text-ink-muted">{{ formatPosBR(kid.position) }}</span>
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
          class="min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded-lg bg-emeraldpro hover:bg-emeraldpro-hover disabled:bg-borderline disabled:text-ink-muted disabled:cursor-not-allowed text-night text-[11px] font-bold shrink-0"
        >
          Promover
        </button>
      </ListRow>
    </div>
  </BaseCard>
</template>
