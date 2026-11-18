<script setup lang="ts">
import { computed } from 'vue'
import { Play, Shield } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import TeamCrest from '@/components/ui/TeamCrest.vue'

// Card de próximo jogo: o mesmo para a liga e para cada competição, para o dashboard ter um visual só.
const props = defineProps<{
  /** Chip do topo, por exemplo "Liga • Série D • 1ª Fase". */
  title: string
  /** Texto do canto, por exemplo "Em casa (Arena Super XI)". */
  venue?: string
  clubName: string
  /** Mandante do jogo: o usuário joga em casa? */
  isHome: boolean
  opponentName: string
  opponentPower: number
  opponentStyle?: string | null
  playLabel: string
}>()

defineEmits<{ tactics: []; play: [] }>()

const homeName = computed(() => (props.isHome ? props.clubName : props.opponentName))
const awayName = computed(() => (props.isHome ? props.opponentName : props.clubName))
</script>

<template>
  <BaseCard padding="p-4 sm:p-5" class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
      <span class="px-2.5 py-0.5 rounded-full bg-emeraldpro-soft text-emeraldpro text-[11px] font-bold uppercase tracking-wide max-w-full break-words">
        {{ title }}
      </span>
      <span v-if="venue" class="text-[11px] font-semibold text-ink-muted min-w-0 break-words [overflow-wrap:anywhere]">{{ venue }}</span>
    </div>

    <div class="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
      <div class="flex flex-col items-center gap-2 min-w-0">
        <TeamCrest size="md" :name="homeName" :is-user="isHome" />
        <span class="font-extrabold text-sm sm:text-base text-ink max-w-full truncate" :title="homeName">{{ homeName }}</span>
      </div>
      <span class="font-score font-extrabold text-ink-muted text-sm">VS</span>
      <div class="flex flex-col items-center gap-2 min-w-0">
        <TeamCrest size="md" :name="awayName" :is-user="!isHome" />
        <span class="font-extrabold text-sm sm:text-base text-ink max-w-full truncate" :title="awayName">{{ awayName }}</span>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2.5">
      <span class="text-[11px] text-ink-muted min-w-0 break-words">
        <template v-if="opponentStyle">{{ opponentStyle }} • </template>OVER <strong class="text-ink">{{ opponentPower }}</strong>
      </span>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="px-3 py-2 min-h-10 md:min-h-0 md:py-1.5 rounded-lg bg-subtle hover:bg-borderline text-ink text-[11px] font-bold transition-colors flex items-center gap-1"
          @click="$emit('tactics')"
        >
          <Shield class="w-3 h-3 text-emeraldpro" />
          Tática
        </button>
        <button
          type="button"
          class="px-3 py-2 min-h-10 md:min-h-0 md:py-1.5 rounded-lg bg-emeraldpro hover:bg-emeraldpro-hover text-night text-[11px] font-bold flex items-center gap-1"
          @click="$emit('play')"
        >
          <Play class="w-3 h-3 fill-current" />
          {{ playLabel }}
        </button>
      </div>
    </div>
  </BaseCard>
</template>
