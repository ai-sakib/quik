<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { X } from 'lucide-vue-next'
import CallScreen from '@/components/call/CallScreen.vue'
import IncomingCallToast from '@/components/call/IncomingCallToast.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useAuthStore } from '@/stores/auth'
import { useCallStore } from '@/stores/call'
import { useConversationsStore } from '@/stores/conversations'
import { useUsersStore } from '@/stores/users'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const users = useUsersStore()
const conversations = useConversationsStore()
const call = useCallStore()

// On small screens we show either the list or the open conversation.
const isConversationOpen = computed(() => route.name === 'conversation')

// Best effort: leave the call when the tab is closed or reloaded.
const leaveCall = () => call.leave()

onMounted(() => {
  users.start()
  conversations.start()
  window.addEventListener('pagehide', leaveCall)
})

onBeforeUnmount(() => {
  window.removeEventListener('pagehide', leaveCall)
  call.leave()
  conversations.stop()
  users.stop()
})

// Signed out (here or in another tab): back to the login page.
watch(
  () => auth.user,
  (user) => {
    if (!user) router.replace({ name: 'login' })
  },
)
</script>

<template>
  <div v-if="auth.user" class="flex h-full overflow-hidden">
    <AppSidebar
      :class="['w-full shrink-0 md:flex md:w-80 lg:w-96', isConversationOpen ? 'hidden' : 'flex']"
    />
    <main
      :class="[
        'min-w-0 flex-1 flex-col bg-slate-50 md:flex',
        isConversationOpen ? 'flex' : 'hidden',
      ]"
    >
      <RouterView />
    </main>

    <IncomingCallToast />
    <CallScreen v-if="call.isActive" />

    <div
      v-if="call.error"
      role="alert"
      class="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-medium text-white shadow-xl"
    >
      <span class="flex-1">{{ call.error }}</span>
      <button type="button" aria-label="Dismiss" @click="call.error = null">
        <X class="size-4" />
      </button>
    </div>
  </div>
</template>
