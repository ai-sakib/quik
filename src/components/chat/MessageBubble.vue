<script setup>
import UserAvatar from '@/components/ui/UserAvatar.vue'

defineProps({
  text: { type: String, required: true },
  time: { type: String, default: '' },
  isMine: { type: Boolean, default: false },
  /** Group chats: shown above the first message of a run from the same person. */
  senderName: { type: String, default: null },
  /** Group chats: the avatar column (avatar itself is only shown on the last message of a run). */
  avatar: { type: Object, default: null }, // { name, photoURL, visible }
})
</script>

<template>
  <div :class="['flex items-end gap-2', isMine ? 'justify-end' : 'justify-start']">
    <div v-if="avatar" class="w-8 shrink-0">
      <UserAvatar
        v-if="avatar.visible"
        :name="avatar.name"
        :photo-url="avatar.photoURL"
        size="sm"
      />
    </div>

    <div
      :class="['flex max-w-[78%] flex-col sm:max-w-[65%]', isMine ? 'items-end' : 'items-start']"
    >
      <span v-if="senderName" class="mb-1 ml-3 text-xs font-medium text-slate-500">
        {{ senderName }}
      </span>
      <p
        :class="[
          'rounded-3xl px-4 py-2 text-[15px] leading-relaxed break-words whitespace-pre-wrap',
          isMine
            ? 'rounded-br-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/15'
            : 'rounded-bl-lg bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/70',
        ]"
      >
        {{ text }}
      </p>
      <time v-if="time" class="mx-3 mt-1 text-[11px] text-slate-400">{{ time }}</time>
    </div>
  </div>
</template>
