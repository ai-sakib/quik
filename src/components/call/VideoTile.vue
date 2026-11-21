<script setup>
import { useTemplateRef, watchEffect } from 'vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'

const props = defineProps({
  stream: { type: Object, default: null }, // MediaStream
  name: { type: String, required: true },
  photoUrl: { type: String, default: null },
  /** Our own camera: mirrored, and muted so we don't hear ourselves. */
  isLocal: { type: Boolean, default: false },
  /** When false (voice call or camera off) the avatar is shown; audio keeps playing. */
  showVideo: { type: Boolean, default: true },
})

const video = useTemplateRef('video')

// `srcObject` can't be bound in the template, so set it once the <video> element exists.
watchEffect(
  () => {
    if (video.value) video.value.srcObject = props.stream
  },
  { flush: 'post' },
)
</script>

<template>
  <figure
    :aria-label="name"
    class="relative overflow-hidden rounded-3xl bg-slate-800 ring-1 ring-white/5"
  >
    <video
      ref="video"
      autoplay
      playsinline
      :muted="isLocal"
      :class="['size-full object-cover', { '-scale-x-100': isLocal, hidden: !showVideo }]"
    />
    <div v-if="!showVideo" class="absolute inset-0 flex items-center justify-center">
      <UserAvatar :name="name" :photo-url="photoUrl" size="xl" />
    </div>
    <figcaption
      class="absolute bottom-3 left-3 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur"
    >
      {{ name }}
    </figcaption>
  </figure>
</template>
