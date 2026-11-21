<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, default: '' },
  photoUrl: { type: String, default: null },
  size: { type: String, default: 'md' }, // xs | sm | md | lg | xl
})

const SIZES = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-12 text-base',
  xl: 'size-24 text-3xl',
}

const COLORS = [
  'from-indigo-500 to-violet-500',
  'from-sky-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-fuchsia-500 to-purple-500',
]

const initials = computed(() =>
  props.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join(''),
)

// The same name always gets the same color.
const color = computed(() => {
  const hash = [...props.name].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return COLORS[hash % COLORS.length]
})
</script>

<template>
  <img
    v-if="photoUrl"
    :src="photoUrl"
    :alt="name"
    referrerpolicy="no-referrer"
    :class="['shrink-0 rounded-full object-cover', SIZES[size]]"
  />
  <span
    v-else
    role="img"
    :aria-label="name"
    :class="[
      'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white',
      SIZES[size],
      color,
    ]"
  >
    {{ initials || '?' }}
  </span>
</template>
