<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { LogOut, Plus } from 'lucide-vue-next'
import ConversationList from '@/components/conversations/ConversationList.vue'
import NewConversationDialog from '@/components/conversations/NewConversationDialog.vue'
import AppLogo from '@/components/ui/AppLogo.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import { useAuthStore } from '@/stores/auth'
import { useCallStore } from '@/stores/call'
import { useConversationsStore } from '@/stores/conversations'
import { useUsersStore } from '@/stores/users'

const route = useRoute()
const auth = useAuthStore()
const users = useUsersStore()
const conversations = useConversationsStore()
const call = useCallStore()

const isNewConversationOpen = ref(false)

async function signOut() {
  await call.leave() // while we still have permission to update the call
  await auth.signOut()
}
</script>

<template>
  <aside class="flex min-h-0 flex-col border-r border-slate-200 bg-white">
    <header class="flex items-center justify-between px-5 pt-5 pb-4">
      <AppLogo />
      <button
        type="button"
        aria-label="New conversation"
        title="New conversation"
        class="rounded-full bg-indigo-600 p-2 text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500"
        @click="isNewConversationOpen = true"
      >
        <Plus class="size-5" />
      </button>
    </header>

    <h2 class="px-5 pb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">Chats</h2>
    <div class="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-2">
      <ConversationList
        :conversations="conversations.sorted"
        :current-user-id="auth.user.id"
        :users-by-id="users.byId"
        :selected-id="route.params.conversationId ?? null"
      />
    </div>

    <footer class="flex items-center gap-3 border-t border-slate-100 px-4 py-3">
      <UserAvatar :name="auth.user.name" :photo-url="auth.user.photoURL" />
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold">{{ auth.user.name }}</p>
        <p class="truncate text-xs text-slate-500">{{ auth.user.email }}</p>
      </div>
      <button
        type="button"
        aria-label="Sign out"
        title="Sign out"
        class="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        @click="signOut"
      >
        <LogOut class="size-5" />
      </button>
    </footer>

    <NewConversationDialog v-if="isNewConversationOpen" @close="isNewConversationOpen = false" />
  </aside>
</template>
