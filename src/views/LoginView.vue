<script setup>
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LoaderCircle, MessageCircle, Phone, Users, Video } from 'lucide-vue-next'
import AppLogo from '@/components/ui/AppLogo.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const FEATURES = [
  { icon: Video, label: 'Video calls' },
  { icon: Phone, label: 'Voice calls' },
  { icon: MessageCircle, label: 'Chat' },
  { icon: Users, label: 'Groups' },
]

// As soon as we're signed in, continue to where the user wanted to go.
watch(
  () => auth.user,
  (user) => {
    if (!user) return
    const redirect = route.query.redirect
    router.replace(typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/')
  },
  { immediate: true },
)
</script>

<template>
  <main
    class="relative flex min-h-full items-center justify-center overflow-hidden bg-slate-950 px-4 py-12"
  >
    <div
      class="pointer-events-none absolute -top-32 -left-32 size-[28rem] rounded-full bg-indigo-600/30 blur-3xl"
    />
    <div
      class="pointer-events-none absolute -right-24 -bottom-40 size-[28rem] rounded-full bg-fuchsia-600/20 blur-3xl"
    />

    <div
      class="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-xl sm:p-10"
    >
      <div class="flex justify-center"><AppLogo dark /></div>

      <h1 class="mt-8 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        Talk face to face, instantly.
      </h1>
      <p class="mt-3 text-slate-400">
        Video calls, voice calls and chat. One-on-one or with your whole group.
      </p>

      <ul class="mt-6 flex flex-wrap justify-center gap-2">
        <li
          v-for="feature in FEATURES"
          :key="feature.label"
          class="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-white/10"
        >
          <component :is="feature.icon" class="size-3.5" />
          {{ feature.label }}
        </li>
      </ul>

      <button
        type="button"
        :disabled="auth.isSigningIn"
        class="mt-10 flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-3.5 font-semibold text-slate-900 shadow-lg transition hover:bg-slate-100 disabled:opacity-70"
        @click="auth.signInWithGoogle()"
      >
        <LoaderCircle v-if="auth.isSigningIn" class="size-5 animate-spin" />
        <svg v-else class="size-5" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#FFC107"
            d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
          />
          <path
            fill="#FF3D00"
            d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
          />
          <path
            fill="#1976D2"
            d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
          />
        </svg>
        Continue with Google
      </button>

      <p v-if="auth.error" role="alert" class="mt-4 text-sm text-rose-400">{{ auth.error }}</p>
    </div>
  </main>
</template>
