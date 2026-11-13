<script setup lang="ts">
import { useClubStore } from '@/stores/club'
import { useLeagueStore } from '@/stores/league'
import { useSquadStore } from '@/stores/squad'
import { useNavigation } from '@/composables/useNavigation'
import ClubCrest from '@/components/ui/ClubCrest.vue'

const club = useClubStore()
const league = useLeagueStore()
const squad = useSquadStore()
const { navItems, goTo } = useNavigation()
</script>

<template>
  <aside class="hidden md:flex md:w-64 bg-surface border-r border-borderline flex-col justify-between shrink-0 sticky top-0 h-screen overflow-y-auto z-20 self-start">
    <div>
      <div class="px-5 md:h-20 py-5 md:py-0 border-b border-borderline flex items-center gap-3">
        <ClubCrest size="md" />
        <div class="min-w-0">
          <h1 class="font-bold text-base leading-tight text-ink truncate">{{ club.name }}</h1>
          <p class="text-xs text-ink-muted font-medium truncate">
            Série {{ league.serieMeta.code }} • Temp. {{ club.season }}
          </p>
        </div>
      </div>

      <nav class="p-3 space-y-1">
        <button
          type="button"
          v-for="item in navItems"
          :key="item.id"
          @click="goTo(item)"
          :class="[
            'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all',
            item.active
              ? 'bg-emeraldpro text-white shadow-sm'
              : 'text-ink-muted hover:bg-subtle hover:text-ink'
          ]"
        >
          <span class="flex items-center gap-3 min-w-0">
            <component :is="item.icon" class="w-4 h-4 shrink-0" />
            {{ item.label }}
          </span>
          <span
            v-if="item.live"
            :class="[
              'flex items-center gap-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full',
              item.active ? 'bg-white text-emeraldpro' : 'bg-emeraldpro-soft text-emeraldpro'
            ]"
          >
            <span class="relative flex w-1.5 h-1.5">
              <span class="absolute inline-flex w-full h-full rounded-full bg-emeraldpro opacity-75 animate-ping"></span>
              <span class="relative inline-flex w-1.5 h-1.5 rounded-full bg-emeraldpro"></span>
            </span>
            AO VIVO
          </span>
          <span
            v-if="item.badge"
            :class="[
              'text-[11px] font-bold px-2 py-0.5 rounded-full',
              item.active ? 'bg-white/20 text-white' : 'bg-emeraldpro-soft text-emeraldpro'
            ]"
          >
            {{ item.badge }}
          </span>
        </button>
      </nav>
    </div>

    <div class="p-4 border-t border-borderline space-y-3">
      <div class="bg-subtle rounded-xl p-3 space-y-1.5">
        <div class="flex items-center justify-between text-xs text-ink-muted">
          <span>OVER</span>
          <span class="font-score font-bold text-base text-ink">{{ squad.teamStrength.total }}</span>
        </div>
        <div class="flex items-center justify-between text-xs text-ink-muted">
          <span>Posição na Liga</span>
          <span class="font-bold text-emeraldpro">{{ league.userLeagueRank }}º ({{ league.userLeaguePoints }} pts)</span>
        </div>
        <div class="flex items-center justify-between text-xs text-ink-muted">
          <span>Elenco</span>
          <span class="font-semibold text-ink">{{ squad.players.length }} / {{ club.maxSquadCapacity }}</span>
        </div>
      </div>
    </div>
  </aside>
</template>
