<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { X } from 'lucide-vue-next'

defineProps({
  title: { type: String, required: true },
})
const emit = defineEmits(['close'])

function closeOnEscape(event) {
  if (event.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', closeOnEscape))
onBeforeUnmount(() => window.removeEventListener('keydown', closeOnEscape))
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4">
      <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" @click="emit('close')" />
      <section
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        class="relative flex max-h-[90dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl"
      >
        <header class="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 class="text-lg font-semibold">{{ title }}</h2>
          <button
            type="button"
            aria-label="Close"
            class="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            @click="emit('close')"
          >
            <X class="size-5" />
          </button>
        </header>
        <slot />
      </section>
    </div>
  </Teleport>
</template>
