<script setup>
import { Video } from 'lucide-vue-next'

defineProps({
  dark: { type: Boolean, default: false }, // white text, for dark backgrounds
})
</script>

<template>
  <div class="flex items-center gap-2.5">
    <span
      class="inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/30"
    >
      <Video class="size-5 text-white" />
    </span>
    <span :class="['text-xl font-bold tracking-tight', dark ? 'text-white' : 'text-slate-900']">
      Quik
    </span>
  </div>
</template>
