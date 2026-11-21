<script setup>
import { computed, nextTick, ref } from 'vue'
import { SendHorizontal } from 'lucide-vue-next'

defineProps({
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['send'])

const text = ref('')
const textarea = ref(null)
const canSend = computed(() => text.value.trim().length > 0)

function send() {
  if (!canSend.value) return
  emit('send', text.value.trim())
  text.value = ''
  nextTick(resize)
}

// Enter sends, Shift+Enter adds a new line.
function onKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    send()
  }
}

function resize() {
  const element = textarea.value
  if (!element) return
  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, 160)}px`
}
</script>

<template>
  <form class="border-t border-slate-200 bg-white px-4 py-3 sm:px-6" @submit.prevent="send">
    <div
      class="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl bg-slate-100 py-1.5 pr-1.5 pl-4 focus-within:ring-2 focus-within:ring-indigo-500/40"
    >
      <label class="flex-1">
        <span class="sr-only">Message</span>
        <textarea
          ref="textarea"
          v-model="text"
          rows="1"
          placeholder="Write a message…"
          :disabled="disabled"
          class="block max-h-40 w-full resize-none bg-transparent py-2 text-[15px] outline-none placeholder:text-slate-400"
          @keydown="onKeydown"
          @input="resize"
        />
      </label>
      <button
        type="submit"
        aria-label="Send message"
        :disabled="disabled || !canSend"
        class="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:bg-slate-300"
      >
        <SendHorizontal class="size-5" />
      </button>
    </div>
  </form>
</template>
