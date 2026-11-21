<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { LoaderCircle } from 'lucide-vue-next'
import ConversationAvatar from '@/components/ui/ConversationAvatar.vue'
import { useAuthStore } from '@/stores/auth'
import { useCallStore } from '@/stores/call'
import { useUsersStore } from '@/stores/users'
import { conversationTitle } from '@/utils/conversations'
import CallControls from './CallControls.vue'
import VideoTile from './VideoTile.vue'

const auth = useAuthStore()
const users = useUsersStore()
const call = useCallStore()

const isVideoCall = computed(() => call.kind === 'video')
const title = computed(() =>
  call.conversation ? conversationTitle(call.conversation, auth.user.id, users.byId) : 'Call',
)

const remoteParticipants = computed(() =>
  Object.entries(call.remoteStreams).map(([userId, stream]) => ({
    userId,
    stream,
    name: users.byId[userId]?.name ?? 'Guest',
    photoURL: users.byId[userId]?.photoURL ?? null,
  })),
)

const gridColumns = computed(() => {
  const count = remoteParticipants.value.length
  if (count <= 1) return 'grid-cols-1'
  if (count <= 4) return 'grid-cols-1 sm:grid-cols-2'
  return 'grid-cols-2 lg:grid-cols-3'
})

// Call duration, counted from when this screen opened.
const startedAt = Date.now()
const now = ref(startedAt)
const timer = setInterval(() => (now.value = Date.now()), 1000)
onBeforeUnmount(() => clearInterval(timer))

const duration = computed(() => {
  const seconds = Math.floor((now.value - startedAt) / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
})

const statusText = computed(() => {
  if (call.status === 'joining') return 'Connecting…'
  if (remoteParticipants.value.length === 0) return 'Waiting for others to join…'
  return duration.value
})
</script>

<template>
  <section
    role="dialog"
    :aria-label="`Call with ${title}`"
    class="fixed inset-0 z-30 flex flex-col bg-slate-950 text-white"
  >
    <header class="flex items-center justify-between gap-4 px-6 py-4">
      <div class="min-w-0">
        <h2 class="truncate text-lg font-semibold">{{ title }}</h2>
        <p class="text-sm text-slate-400" aria-live="polite">{{ statusText }}</p>
      </div>
      <span class="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300">
        {{ isVideoCall ? 'Video call' : 'Voice call' }}
      </span>
    </header>

    <div class="relative min-h-0 flex-1 px-4 pb-4">
      <div
        v-if="remoteParticipants.length"
        :class="['grid h-full auto-rows-fr gap-3', gridColumns]"
      >
        <VideoTile
          v-for="participant in remoteParticipants"
          :key="participant.userId"
          :stream="participant.stream"
          :name="participant.name"
          :photo-url="participant.photoURL"
          :show-video="isVideoCall"
        />
      </div>

      <div v-else class="flex h-full flex-col items-center justify-center gap-6 text-slate-300">
        <div class="relative">
          <span class="absolute inset-0 animate-ping rounded-full bg-indigo-500/30" />
          <ConversationAvatar
            :is-group="call.conversation?.type === 'group'"
            :name="title"
            size="lg"
          />
        </div>
        <LoaderCircle v-if="call.status === 'joining'" class="size-6 animate-spin" />
      </div>

      <VideoTile
        :stream="call.localStream"
        name="You"
        :photo-url="auth.user.photoURL"
        is-local
        :show-video="isVideoCall && call.isCameraOn"
        class="absolute right-6 bottom-6 h-36 w-28 shadow-2xl sm:h-40 sm:w-60"
      />
    </div>

    <CallControls
      class="pt-2 pb-8"
      :is-mic-on="call.isMicOn"
      :is-camera-on="call.isCameraOn"
      :show-camera-toggle="isVideoCall"
      :disabled="call.status !== 'connected'"
      @toggle-mic="call.toggleMic()"
      @toggle-camera="call.toggleCamera()"
      @hang-up="call.hangUp()"
    />
  </section>
</template>
