<script setup>
import { computed } from 'vue'
import { ArrowLeft, Phone, Video } from 'lucide-vue-next'
import ConversationAvatar from '@/components/ui/ConversationAvatar.vue'
import { useAuthStore } from '@/stores/auth'
import { useCallStore } from '@/stores/call'
import { useUsersStore } from '@/stores/users'
import { conversationTitle, otherMemberId } from '@/utils/conversations'

const props = defineProps({
  conversation: { type: Object, required: true },
})

const auth = useAuthStore()
const users = useUsersStore()
const call = useCallStore()

const isGroup = computed(() => props.conversation.type === 'group')
const title = computed(() => conversationTitle(props.conversation, auth.user.id, users.byId))
const otherUser = computed(() =>
  isGroup.value ? null : users.byId[otherMemberId(props.conversation, auth.user.id)],
)

const subtitle = computed(() => {
  if (!isGroup.value) return otherUser.value?.email ?? ''
  const names = props.conversation.memberIds
    .filter((id) => id !== auth.user.id)
    .map((id) => users.byId[id]?.name.split(' ')[0] ?? 'Unknown')
  return `You, ${names.join(', ')}`
})

const ongoingCall = computed(() => props.conversation.activeCall)
const canJoinCall = computed(() => ongoingCall.value && ongoingCall.value.id !== call.callId)
</script>

<template>
  <header
    class="flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6"
  >
    <RouterLink
      :to="{ name: 'home' }"
      aria-label="Back to conversations"
      class="-ml-1 rounded-full p-1.5 text-slate-600 hover:bg-slate-100 md:hidden"
    >
      <ArrowLeft class="size-5" />
    </RouterLink>

    <ConversationAvatar
      :is-group="isGroup"
      :name="title"
      :photo-url="otherUser?.photoURL"
      size="md"
    />
    <div class="min-w-0 flex-1">
      <h1 class="truncate font-semibold">{{ title }}</h1>
      <p class="truncate text-xs text-slate-500">{{ subtitle }}</p>
    </div>

    <button
      v-if="canJoinCall"
      type="button"
      :disabled="call.isActive"
      class="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:opacity-50"
      @click="call.joinCall(conversation)"
    >
      <component :is="ongoingCall.kind === 'video' ? Video : Phone" class="size-4" />
      Join call
    </button>

    <div v-else class="flex items-center gap-1">
      <button
        type="button"
        aria-label="Start voice call"
        title="Voice call"
        :disabled="call.isActive"
        class="rounded-full p-2.5 text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-40"
        @click="call.startCall(conversation, 'audio')"
      >
        <Phone class="size-5" />
      </button>
      <button
        type="button"
        aria-label="Start video call"
        title="Video call"
        :disabled="call.isActive"
        class="rounded-full p-2.5 text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-40"
        @click="call.startCall(conversation, 'video')"
      >
        <Video class="size-5" />
      </button>
    </div>
  </header>
</template>
