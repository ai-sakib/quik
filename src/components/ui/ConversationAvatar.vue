<script setup>
import { Users } from 'lucide-vue-next'
import UserAvatar from './UserAvatar.vue'

defineProps({
  isGroup: { type: Boolean, default: false },
  name: { type: String, default: '' },
  photoUrl: { type: String, default: null },
  size: { type: String, default: 'md' },
})
</script>

<template>
  <span
    v-if="isGroup"
    role="img"
    :aria-label="name"
    :class="[
      'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white',
      size === 'lg' ? 'size-12' : size === 'sm' ? 'size-8' : 'size-10',
    ]"
  >
    <Users :class="size === 'sm' ? 'size-4' : 'size-5'" />
  </span>
  <UserAvatar v-else :name="name" :photo-url="photoUrl" :size="size" />
</template>
