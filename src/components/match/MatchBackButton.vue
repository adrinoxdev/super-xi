<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useNavigation } from '@/composables/useNavigation'

const router = useRouter()
const { matchOwner } = useNavigation()
</script>

<template>
  <button
    v-if="matchOwner"
    type="button"
    :title="`Voltar para ${matchOwner.label} (a partida continua)`"
    @click.prevent.stop="router.push(matchOwner.path)"
  >
    <ArrowLeft class="w-4 h-4 shrink-0" />
    Voltar
  </button>
</template>
