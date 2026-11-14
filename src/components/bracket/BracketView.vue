<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue'
import { computed, ref } from 'vue'
import BracketTieCard from '@/components/bracket/BracketTieCard.vue'
import type { Bracket, BracketTie } from '@/types/bracket'

const props = defineProps<{
  bracket: Bracket
  title?: string
  userPower?: number
}>()

const hasUser = (t: BracketTie) => t.homeId === 'user' || t.awayId === 'user'
const isPendingUser = (t: BracketTie) => hasUser(t) && !t.winnerId && !!t.homeId && !!t.awayId

const tabs = computed(() => {
  const list: Array<{ key: string; shortLabel: string; ties: BracketTie[] }> = props.bracket.rounds.map((r) => ({
    key: r.key,
    shortLabel: r.shortLabel,
    ties: r.ties
  }))
  if (props.bracket.thirdPlace) list.push({ key: 'third', shortLabel: '3º lugar', ties: [props.bracket.thirdPlace] })
  if (props.bracket.side)
    list.push({ key: props.bracket.side.key, shortLabel: props.bracket.side.label, ties: props.bracket.side.ties })
  return list
})

function pickDefaultTab(): number {
  const t = tabs.value
  const pending = t.findIndex((x) => x.ties.some(isPendingUser))
  if (pending >= 0) return pending
  let last = 0
  t.forEach((x, i) => {
    if (x.ties.some((tie) => tie.winnerId)) last = i
  })
  return last
}
const activeTab = ref(pickDefaultTab())
const currentTab = computed(() => tabs.value[Math.min(activeTab.value, tabs.value.length - 1)])

function pickUserRound(): number | null {
  const rs = props.bracket.rounds
  const pending = rs.findIndex((r) => r.ties.some(isPendingUser))
  if (pending >= 0) return pending
  let last = -1
  rs.forEach((r, i) => {
    if (r.ties.some(hasUser)) last = i
  })
  return last >= 0 ? last : null
}

const maxStart = computed(() => Math.max(0, props.bracket.rounds.length - 4))
const startRound = ref(
  (props.bracket.rounds[0]?.ties.length ?? 0) <= 8
    ? 0
    : Math.min(pickUserRound() ?? 0, Math.max(0, props.bracket.rounds.length - 4))
)
const effectiveStart = computed(() => Math.min(startRound.value, maxStart.value))
const visibleRounds = computed(() => props.bracket.rounds.slice(effectiveStart.value))

function outClass(tie: BracketTie): string {
  return tie.winnerId === 'user' ? 'border-emeraldpro' : 'border-borderline'
}
// Altura de cada faixa de confronto (maior que o cartão compacto); a árvore tem faixa × confrontos da 1ª coluna.
const SLOT_H = 88
const treeHeight = computed(() => (visibleRounds.value[0]?.ties.length ?? 1) * SLOT_H)
</script>

<template>
  <BaseCard as="section" padding="p-4 sm:p-5" class="space-y-4">
    <header class="flex flex-wrap items-center justify-between gap-2">
      <h4 class="font-bold text-sm text-ink min-w-0 break-words">{{ title ?? 'Chaveamento' }}</h4>
      <span class="flex items-center gap-1.5 text-[11px] text-ink-muted">
        <span class="w-2.5 h-2.5 rounded-sm bg-emeraldpro"></span> Seu caminho
      </span>
    </header>

    <!-- Celular: fases em abas -->
    <div v-if="currentTab" class="md:hidden space-y-3">
      <div class="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 snap-x">
        <button
          v-for="(t, i) in tabs"
          :key="t.key"
          type="button"
          :class="[
            'shrink-0 snap-start px-3.5 py-2.5 min-h-11 rounded-lg text-xs font-bold',
            i === activeTab ? 'bg-emeraldpro text-white' : 'bg-subtle text-ink-muted'
          ]"
          @click="activeTab = i"
        >
          {{ t.shortLabel }}
        </button>
      </div>
      <div class="space-y-2">
        <BracketTieCard
          v-for="tie in currentTab.ties"
          :key="tie.id"
          :tie="tie"
          :teams="bracket.teams"
          :user-power="userPower"
        />
      </div>
    </div>

    <!-- Desktop: árvore em colunas -->
    <div class="hidden md:block space-y-3">
      <div v-if="bracket.rounds.length > 4" class="flex flex-wrap items-center gap-1.5">
        <span class="text-[11px] text-ink-muted mr-1">Ver a partir de:</span>
        <button
          v-for="(r, i) in bracket.rounds.slice(0, maxStart + 1)"
          :key="r.key"
          type="button"
          :class="[
            'px-2.5 py-2 md:py-1 rounded-lg text-[11px] font-bold',
            i === effectiveStart ? 'bg-emeraldpro text-white' : 'bg-subtle text-ink-muted'
          ]"
          @click="startRound = i"
        >
          {{ r.shortLabel }}
        </button>
      </div>
      <div class="overflow-auto max-h-[70dvh] -mx-1 px-1">
        <div class="flex gap-6 min-w-max pb-1" data-bracket-tree>
          <div v-for="(round, ri) in visibleRounds" :key="round.key" class="flex flex-col w-56" data-bracket-round>
            <div class="h-5 mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-muted truncate" :title="round.label">{{ round.label }}</div>
            <!-- Cada confronto ocupa uma faixa de mesma altura (flex-1); a altura total é fixa e igual
                 em todas as colunas, então a faixa da fase N+1 cobre exatamente as duas da fase N.
                 Cartão centralizado na faixa e conectores relativos à faixa: independe da altura do cartão. -->
            <div class="flex flex-col" :style="{ height: treeHeight + 'px' }">
              <div
                v-for="(tie, ti) in round.ties"
                :key="tie.id"
                class="relative flex-1 min-h-0 flex items-center"
                data-bracket-slot
                :data-round="ri"
                :data-slot="ti"
              >
                <BracketTieCard compact class="w-full relative z-10" :tie="tie" :teams="bracket.teams" :user-power="userPower" />
                <template v-if="ri > 0">
                  <span
                    :class="['absolute -left-3 top-1/2 w-3 border-t-2 -translate-y-px', hasUser(tie) ? 'border-emeraldpro' : 'border-borderline']"
                    data-line="in"
                  ></span>
                </template>
                <template v-if="ri < visibleRounds.length - 1">
                  <span
                    :class="['absolute -right-3 top-1/2 w-3 border-t-2 -translate-y-px', outClass(tie)]"
                    data-line="out"
                  ></span>
                  <span
                    :class="[
                      'absolute -right-3 w-0 border-r-2',
                      ti % 2 === 0 ? 'top-1/2 bottom-0' : 'top-0 bottom-1/2',
                      outClass(tie)
                    ]"
                    data-line="join"
                  ></span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Decisões extras (desktop; no celular entram como abas) -->
    <div v-if="bracket.thirdPlace || bracket.side" class="hidden md:grid gap-3 sm:grid-cols-2">
      <div v-if="bracket.thirdPlace" class="space-y-1.5">
        <h5 class="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Disputa de 3º lugar</h5>
        <BracketTieCard :tie="bracket.thirdPlace" :teams="bracket.teams" :user-power="userPower" />
      </div>
      <div v-if="bracket.side" class="space-y-1.5">
        <h5 class="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{{ bracket.side.label }}</h5>
        <BracketTieCard v-for="t in bracket.side.ties" :key="t.id" :tie="t" :teams="bracket.teams" :user-power="userPower" />
      </div>
    </div>
  </BaseCard>
</template>
