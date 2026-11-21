<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { formatClockTime } from '@/utils/time'
import MessageBubble from './MessageBubble.vue'

const props = defineProps({
  messages: { type: Array, required: true },
  currentUserId: { type: String, required: true },
  usersById: { type: Object, required: true },
  isGroup: { type: Boolean, default: false },
})

const scroller = ref(null)

// Consecutive messages from the same person form a "run": the name is shown on the
// first message of a run, the avatar and time on the last.
const rows = computed(() =>
  props.messages.map((message, index) => {
    const previous = props.messages[index - 1]
    const next = props.messages[index + 1]
    const isMine = message.senderId === props.currentUserId
    const isFirstInRun = previous?.senderId !== message.senderId
    const isLastInRun = next?.senderId !== message.senderId
    const sender = props.usersById[message.senderId]
    const showGroupDetails = props.isGroup && !isMine

    return {
      id: message.id,
      text: message.text,
      isMine,
      time: isLastInRun ? formatClockTime(message.sentAt) : '',
      senderName: showGroupDetails && isFirstInRun ? (sender?.name ?? 'Unknown') : null,
      avatar: showGroupDetails
        ? { name: sender?.name ?? '?', photoURL: sender?.photoURL, visible: isLastInRun }
        : null,
      spacing: isFirstInRun ? 'mt-4' : 'mt-1',
    }
  }),
)

// Keep the newest message in view.
watch(
  () => props.messages.length,
  async () => {
    await nextTick()
    if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
  },
  { immediate: true },
)
</script>

<template>
  <div ref="scroller" class="thin-scrollbar overflow-y-auto px-4 pb-4 sm:px-6">
    <ol aria-label="Messages" class="mx-auto max-w-3xl">
      <li v-for="row in rows" :key="row.id" :class="row.spacing">
        <MessageBubble
          :text="row.text"
          :time="row.time"
          :is-mine="row.isMine"
          :sender-name="row.senderName"
          :avatar="row.avatar"
        />
      </li>
    </ol>
  </div>
</template>
