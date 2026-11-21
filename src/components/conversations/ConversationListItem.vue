<script setup>
import { Phone } from 'lucide-vue-next'
import ConversationAvatar from '@/components/ui/ConversationAvatar.vue'

defineProps({
  to: { type: [String, Object], required: true },
  title: { type: String, required: true },
  preview: { type: String, default: '' },
  time: { type: String, default: '' },
  isGroup: { type: Boolean, default: false },
  photoUrl: { type: String, default: null },
  hasActiveCall: { type: Boolean, default: false },
  isSelected: { type: Boolean, default: false },
})
</script>

<template>
  <RouterLink
    :to="to"
    :aria-current="isSelected ? 'page' : undefined"
    :class="[
      'flex items-center gap-3 rounded-2xl px-3 py-2.5 transition',
      isSelected ? 'bg-indigo-50' : 'hover:bg-slate-100',
    ]"
  >
    <ConversationAvatar :is-group="isGroup" :name="title" :photo-url="photoUrl" size="lg" />

    <div class="min-w-0 flex-1">
      <div class="flex items-baseline justify-between gap-2">
        <p class="truncate font-semibold text-slate-900">{{ title }}</p>
        <span class="shrink-0 text-xs text-slate-400">{{ time }}</span>
      </div>
      <p v-if="hasActiveCall" class="flex items-center gap-1 text-sm font-medium text-emerald-600">
        <Phone class="size-3.5" /> Call in progress
      </p>
      <p v-else class="truncate text-sm text-slate-500">{{ preview }}</p>
    </div>
  </RouterLink>
</template>
