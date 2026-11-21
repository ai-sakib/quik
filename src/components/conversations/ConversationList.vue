<script setup>
import { computed } from 'vue'
import { MessagesSquare } from 'lucide-vue-next'
import { conversationTitle, lastMessagePreview, otherMemberId } from '@/utils/conversations'
import { formatShortTime } from '@/utils/time'
import ConversationListItem from './ConversationListItem.vue'

const props = defineProps({
  conversations: { type: Array, required: true },
  currentUserId: { type: String, required: true },
  usersById: { type: Object, required: true },
  selectedId: { type: String, default: null },
})

const items = computed(() =>
  props.conversations.map((conversation) => {
    const isGroup = conversation.type === 'group'
    const otherUser = isGroup
      ? null
      : props.usersById[otherMemberId(conversation, props.currentUserId)]

    return {
      id: conversation.id,
      isGroup,
      title: conversationTitle(conversation, props.currentUserId, props.usersById),
      preview: lastMessagePreview(conversation, props.currentUserId, props.usersById),
      time: formatShortTime(conversation.lastMessage?.sentAt ?? conversation.updatedAt),
      photoUrl: otherUser?.photoURL ?? null,
      hasActiveCall: Boolean(conversation.activeCall),
    }
  }),
)
</script>

<template>
  <nav v-if="items.length" aria-label="Conversations" class="space-y-0.5">
    <ConversationListItem
      v-for="item in items"
      :key="item.id"
      :to="{ name: 'conversation', params: { conversationId: item.id } }"
      :title="item.title"
      :preview="item.preview"
      :time="item.time"
      :is-group="item.isGroup"
      :photo-url="item.photoUrl"
      :has-active-call="item.hasActiveCall"
      :is-selected="item.id === selectedId"
    />
  </nav>

  <div v-else class="flex flex-col items-center px-6 py-16 text-center text-slate-500">
    <MessagesSquare class="size-10 text-slate-300" />
    <p class="mt-3 font-medium text-slate-700">No conversations yet</p>
    <p class="mt-1 text-sm">Start a chat or create a group with the + button.</p>
  </div>
</template>
