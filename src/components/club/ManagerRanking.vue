<script setup lang="ts">
import { useClub } from '@/composables/useClub'
import TeamCrest from '@/components/ui/TeamCrest.vue'

const { managerLeaderboard } = useClub()
</script>

<template>
  <div class="bg-surface rounded-2xl p-5 border border-borderline shadow-sm space-y-3">
    <h3 class="font-bold text-base text-ink">Ranking Nacional de Treinadores</h3>
    <div class="space-y-2 text-xs">
      <div
        v-for="(mgr, idx) in managerLeaderboard"
        :key="mgr.name"
        :class="mgr.isUser ? 'bg-emeraldpro-soft/70 border-emeraldpro font-bold' : 'bg-subtle border-borderline'"
        class="p-2.5 rounded-xl border flex items-center justify-between gap-2"
      >
        <span class="flex items-center gap-2 min-w-0">
          <TeamCrest v-if="!mgr.isUser" class="shrink-0" size="xs" :name="mgr.club" />
          <TeamCrest v-else class="shrink-0" size="xs" is-user />
          <span class="truncate" :title="`${mgr.name} (${mgr.club})`">{{ idx + 1 }}º • {{ mgr.name }} ({{ mgr.club }})</span>
        </span>
        <span class="font-score font-bold text-sm text-emeraldpro shrink-0">{{ mgr.rep }} pts</span>
      </div>
    </div>
  </div>
</template>
