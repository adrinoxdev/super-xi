<script setup lang="ts">
import { computed } from 'vue'
import ClubCrest from '@/components/ui/ClubCrest.vue'
import { useClubStore } from '@/stores/club'
import { getTeamIdentity } from '@/utils/teamIdentities'

// Escudo de qualquer time: usuario (store club, editavel) ou outro time (identidade configurada).
const props = withDefaults(
  defineProps<{
    team?: string
    name?: string
    size?: 'xs' | 'sm' | 'md' | 'lg'
    isUser?: boolean
  }>(),
  { size: 'sm', isUser: false }
)
const club = useClubStore()
const user = computed(() => props.isUser || props.team === 'user' || (!props.team && !!props.name && props.name === club.name))
const identity = computed(() => (user.value ? undefined : getTeamIdentity(props.team || props.name)))
</script>

<template>
  <ClubCrest :size="size" :identity="identity" class="inline-block align-middle" />
</template>
