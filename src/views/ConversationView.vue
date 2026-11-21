<script setup>
import { computed, ref } from 'vue'
import { LoaderCircle } from 'lucide-vue-next'
import ConversationHeader from '@/components/chat/ConversationHeader.vue'
import MessageComposer from '@/components/chat/MessageComposer.vue'
import MessageList from '@/components/chat/MessageList.vue'
import { useMessages } from '@/composables/useMessages'
import { useAuthStore } from '@/stores/auth'
import { useConversationsStore } from '@/stores/conversations'
import { useUsersStore } from '@/stores/users'

const props = defineProps({
  conversationId: { type: String, required: true },
})

const auth = useAuthStore()
const users = useUsersStore()
const conversations = useConversationsStore()

const conversation = computed(() => conversations.byId[props.conversationId])
const { messages, send } = useMessages(() => props.conversationId)
const sendError = ref(null)

async function sendMessage(text) {
  sendError.value = null
  try {
    await send(text)
  } catch (error) {
    console.error('[chat] could not send message', error)
    sendError.value = 'Message not sent. Check your connection and try again.'
  }
}
</script>

<template>
  <div v-if="conversation" class="flex h-full min-h-0 flex-col">
    <ConversationHeader :conversation="conversation" />
    <MessageList
      class="min-h-0 flex-1"
      :messages="messages"
      :current-user-id="auth.user.id"
      :users-by-id="users.byId"
      :is-group="conversation.type === 'group'"
    />
    <p v-if="sendError" role="alert" class="bg-rose-50 px-6 py-2 text-sm text-rose-700">
      {{ sendError }}
    </p>
    <MessageComposer @send="sendMessage" />
  </div>

  <div v-else-if="!conversations.isLoaded" class="flex h-full items-center justify-center">
    <LoaderCircle class="size-8 animate-spin text-indigo-500" aria-label="Loading" />
  </div>

  <div v-else class="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
    <p class="font-semibold">Conversation not found</p>
    <RouterLink :to="{ name: 'home' }" class="text-sm font-medium text-indigo-600 hover:underline">
      Back to your chats
    </RouterLink>
  </div>
</template>
