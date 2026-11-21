<script setup>
import { LoaderCircle } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <RouterView v-if="auth.isReady" />
  <div v-else class="flex h-full items-center justify-center">
    <LoaderCircle class="size-8 animate-spin text-indigo-500" aria-label="Loading" />
  </div>
</template>
