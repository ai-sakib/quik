<script setup>
import { computed, watch } from 'vue'
import { Phone, PhoneOff } from 'lucide-vue-next'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import { RING_DURATION_MS, useCallStore } from '@/stores/call'
import { useUsersStore } from '@/stores/users'

const call = useCallStore()
const users = useUsersStore()

const incoming = computed(() => call.incomingCall)
const caller = computed(() => users.byId[incoming.value?.startedBy])
const description = computed(() => {
  const { kind, conversation } = incoming.value
  const where = conversation.type === 'group' ? ` · ${conversation.name}` : ''
  return `Incoming ${kind === 'video' ? 'video' : 'voice'} call${where}`
})

// Stop ringing after a while if nobody answers.
watch(
  () => incoming.value?.id,
  (callId, _previous, onCleanup) => {
    if (!callId) return
    const timer = setTimeout(() => call.dismiss(callId), RING_DURATION_MS)
    onCleanup(() => clearTimeout(timer))
  },
  { immediate: true },
)
</script>

<template>
  <Transition
    enter-from-class="-translate-y-4 opacity-0"
    leave-to-class="-translate-y-4 opacity-0"
    enter-active-class="transition duration-200"
    leave-active-class="transition duration-200"
  >
    <div
      v-if="incoming"
      role="alertdialog"
      aria-label="Incoming call"
      class="fixed inset-x-4 top-4 z-40 mx-auto max-w-sm rounded-3xl bg-slate-900 p-4 text-white shadow-2xl ring-1 ring-white/10 sm:right-6 sm:left-auto"
    >
      <div class="flex items-center gap-3">
        <div class="relative">
          <span class="absolute inset-0 animate-ping rounded-full bg-emerald-400/40" />
          <UserAvatar :name="caller?.name ?? 'Someone'" :photo-url="caller?.photoURL" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold">{{ caller?.name ?? 'Someone' }}</p>
          <p class="truncate text-sm text-slate-400">{{ description }}</p>
        </div>
        <button
          type="button"
          aria-label="Decline call"
          class="flex size-11 items-center justify-center rounded-full bg-rose-600 transition hover:bg-rose-500"
          @click="call.decline(incoming)"
        >
          <PhoneOff class="size-5" />
        </button>
        <button
          type="button"
          aria-label="Accept call"
          :disabled="call.isActive"
          class="flex size-11 items-center justify-center rounded-full bg-emerald-500 transition hover:bg-emerald-400 disabled:opacity-40"
          @click="call.joinCall(incoming.conversation)"
        >
          <Phone class="size-5" />
        </button>
      </div>
    </div>
  </Transition>
</template>
