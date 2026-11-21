<script setup>
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-vue-next'

defineProps({
  isMicOn: { type: Boolean, required: true },
  isCameraOn: { type: Boolean, required: true },
  showCameraToggle: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle-mic', 'toggle-camera', 'hang-up'])

const toggleClasses = (isOn) => [
  'flex size-14 items-center justify-center rounded-full transition disabled:opacity-40',
  isOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-slate-900 hover:bg-slate-200',
]
</script>

<template>
  <div class="flex items-center justify-center gap-4">
    <button
      type="button"
      :aria-label="isMicOn ? 'Mute microphone' : 'Unmute microphone'"
      :aria-pressed="!isMicOn"
      :disabled="disabled"
      :class="toggleClasses(isMicOn)"
      @click="emit('toggle-mic')"
    >
      <component :is="isMicOn ? Mic : MicOff" class="size-6" />
    </button>

    <button
      v-if="showCameraToggle"
      type="button"
      :aria-label="isCameraOn ? 'Turn camera off' : 'Turn camera on'"
      :aria-pressed="!isCameraOn"
      :disabled="disabled"
      :class="toggleClasses(isCameraOn)"
      @click="emit('toggle-camera')"
    >
      <component :is="isCameraOn ? Video : VideoOff" class="size-6" />
    </button>

    <button
      type="button"
      aria-label="Leave call"
      :disabled="disabled"
      class="flex h-14 w-20 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/30 transition hover:bg-rose-500 disabled:opacity-40"
      @click="emit('hang-up')"
    >
      <PhoneOff class="size-6" />
    </button>
  </div>
</template>
