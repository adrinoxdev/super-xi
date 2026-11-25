<script setup lang="ts">
import { computed } from 'vue'
import { Globe } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import ListRow from '@/components/ui/ListRow.vue'
import { useClubStore } from '@/stores/club'
import { ECOSYSTEM_LINKS, MUNDIAL_EVERY, MUNDIAL_LABEL } from '@/config/competitions'
import type { EcoNode } from '@/config/competitions'
import { cycleInfo } from '@/utils/competitions/mundialCycle'

const club = useClubStore()
const info = computed(() => cycleInfo(club.ecoRecords, club.season))

const NODE_LABEL: Record<EcoNode, string> = {
  serieD: 'Série D',
  serieC: 'Série C',
  serieB: 'Série B',
  serieA: 'Série A',
  cup: 'Taça do Povo',
  ouro: 'Copa Condor de Ouro',
  prata: 'Copa Condor de Prata',
  supercup: 'Supercopa Zênite',
  recopa: 'Recopa dos Condores',
  ranking: 'Ranking Condor',
  mundial: MUNDIAL_LABEL
}
const ROW_NODE = { serieA: 'serieA', cup: 'cup', ouro: 'ouro', prata: 'prata', supercup: 'supercup', recopa: 'recopa' } as const

const doorText = computed(() => {
  if (info.value.door === 'ouro') return 'Campeão da Copa Condor de Ouro no ciclo'
  if (info.value.door === 'ranking') return 'Ranking Condor'
  if (info.value.hostIsUser) return 'Sede (campeão da Série A ou da Taça do Povo) ou Ranking Condor'
  return 'Ranking Condor ou título da Copa Condor de Ouro'
})

/** Caminhos: cada competição com o que a alimenta e para onde leva, lido de ECOSYSTEM_LINKS. */
const paths = computed(() =>
  (Object.keys(NODE_LABEL) as EcoNode[]).map((node) => ({
    node,
    label: NODE_LABEL[node],
    from: ECOSYSTEM_LINKS.filter((l) => l.to === node),
    to: ECOSYSTEM_LINKS.filter((l) => l.from === node)
  }))
)
</script>

<template>
  <div class="space-y-6">
    <BaseCard class="space-y-4">
      <div class="flex items-start gap-3 min-w-0">
        <Globe class="w-6 h-6 text-emeraldpro shrink-0 mt-0.5" />
        <div class="min-w-0">
          <h3 class="text-base sm:text-lg font-extrabold text-ink break-words">Rumo à {{ MUNDIAL_LABEL }}</h3>
          <p class="text-xs text-ink-muted break-words">
            Ciclo de {{ MUNDIAL_EVERY }} temporadas: a próxima edição é na temporada {{ info.target }}.
          </p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 text-xs">
        <div class="p-3 rounded-xl bg-subtle border border-borderline min-w-0">
          <p class="text-ink-muted">Pontos do ciclo</p>
          <p class="text-lg font-extrabold text-ink tabular-nums">{{ info.total }} <span class="text-xs font-semibold text-ink-muted">/ {{ info.cutoff }}</span></p>
        </div>
        <div class="p-3 rounded-xl bg-subtle border border-borderline min-w-0">
          <p class="text-ink-muted">Porta provável</p>
          <p class="font-bold text-ink break-words">{{ doorText }}</p>
        </div>
      </div>
      <p v-if="info.door === 'ouro'" class="text-xs font-bold text-emeraldpro">Vaga garantida pela Copa Condor de Ouro.</p>
      <p v-else-if="info.missing > 0" class="text-xs font-bold text-ink">Faltam {{ info.missing }} pontos para o corte de {{ info.cutoff }}.</p>
      <p v-else class="text-xs font-bold text-emeraldpro">Dentro do corte do Ranking Condor.</p>
      <div class="space-y-1.5">
        <ListRow v-for="r in info.rows" :key="r.key">
          <span class="min-w-0 flex-1 text-ink break-words [overflow-wrap:anywhere]">{{ NODE_LABEL[ROW_NODE[r.key]] }}</span>
          <span class="shrink-0 font-bold tabular-nums" :class="r.points > 0 ? 'text-emeraldpro' : 'text-ink-muted'">{{ r.points }} pts</span>
        </ListRow>
      </div>
    </BaseCard>

    <BaseCard class="space-y-3">
      <h4 class="font-bold text-sm text-ink">Caminhos</h4>
      <p class="text-xs text-ink-muted break-words">De onde vem e para onde leva cada competição.</p>
      <div class="grid gap-3 sm:grid-cols-2">
        <div v-for="p in paths" :key="p.node" class="p-3 rounded-xl bg-subtle border border-borderline min-w-0 space-y-1.5">
          <h5 class="text-xs font-bold text-ink break-words">{{ p.label }}</h5>
          <p class="text-[11px] text-ink-muted break-words">
            <span class="font-bold uppercase tracking-wide">Vem de:</span>
            <template v-if="p.from.length">
              <span v-for="(l, i) in p.from" :key="'f' + i" class="block break-words">{{ NODE_LABEL[l.from] }} ({{ l.rule }})</span>
            </template>
            <span v-else class="block">início de carreira</span>
          </p>
          <p class="text-[11px] text-ink-muted break-words">
            <span class="font-bold uppercase tracking-wide">Leva a:</span>
            <template v-if="p.to.length">
              <span v-for="(l, i) in p.to" :key="'t' + i" class="block break-words">{{ NODE_LABEL[l.to] }} ({{ l.rule }})</span>
            </template>
            <span v-else class="block">ponto final: galeria, pódio e marcos</span>
          </p>
        </div>
      </div>
    </BaseCard>
  </div>
</template>
