<script setup>
import { computed } from 'vue'
import { MessagesSquare } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const firstName = computed(() => auth.user.name.split(' ')[0])
</script>

<template>
  <section class="flex h-full flex-col items-center justify-center p-8 text-center">
    <span
      class="flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-xl shadow-indigo-500/30"
    >
      <MessagesSquare class="size-10" />
    </span>
    <h1 class="mt-6 text-2xl font-semibold">Welcome, {{ firstName }}!</h1>
    <p class="mt-2 max-w-sm text-slate-500">
      Pick a conversation on the left, or press <strong class="text-slate-700">+</strong> to start a
      chat or create a group.
    </p>
  </section>
</template>
